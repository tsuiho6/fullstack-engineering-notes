# 单机并发缓存与 Group：把“查缓存/回源/写回”收成一个闭环

> 优先级：⭐ 必须掌握

## 一、是什么

单机并发缓存是在非线程安全的 LRU 外面加并发保护，再由 `Group` 统一管理一个缓存命名空间和一个数据源回调。

核心 API 可以压缩成：

```text
Group.Get(key) → 命中返回；未命中 → Getter 回源 → 写入 LRU → 返回
```

## 二、为什么需要

LRU 的 map 和链表不是并发安全的。多个 goroutine 同时 Add/Get 可能造成数据竞争、链表损坏或 panic。

但“加一把锁”还不够：缓存还要解决两个边界问题。

- **值的所有权**：调用方传入的 `[]byte` 可能在缓存外被修改。
- **回源方式**：缓存不应该内置数据库、文件或 RPC 逻辑，而应让业务通过回调提供数据源。

## 三、核心用法

### 1. ByteView：用只读视图包住字节

```go
type ByteView struct {
	b []byte // 仅在包内持有
}

func (v ByteView) Len() int { return len(v.b) }

func (v ByteView) ByteSlice() []byte {
	return bytes.Clone(v.b) // 返回副本，调用方不能改缓存内部数据
}

func (v ByteView) String() string { return string(v.b) }
```

输入：内部 `[]byte`。输出：`Len` 是容量统计长度；`ByteSlice` 是新的 `[]byte`；`String` 是内容拷贝到字符串后的值。

### 2. 并发 cache：锁住整个 LRU 操作

```go
type cache struct {
	mu         sync.Mutex
	lru        *lru.Cache
	cacheBytes int64
}

func (c *cache) add(key string, value ByteView) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.lru == nil {
		c.lru = lru.New(c.cacheBytes, nil)
	}
	c.lru.Add(key, value)
}

func (c *cache) get(key string) (ByteView, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.lru == nil {
		return ByteView{}, false
	}
	v, ok := c.lru.Get(key)
	if !ok {
		return ByteView{}, false
	}
	return v.(ByteView), true
}
```

为什么 `Get` 也用 `Mutex`：LRU 的 Get 会移动链表节点。读的是 value，改的是访问顺序。

### 3. Getter 与 GetterFunc

```go
type Getter interface {
	Get(key string) ([]byte, error)
}

type GetterFunc func(string) ([]byte, error)

func (f GetterFunc) Get(key string) ([]byte, error) {
	return f(key)
}
```

`GetterFunc` 是“函数类型实现接口”的惯用法：函数签名匹配时，可以直接传函数；需要状态时，也可以传结构体实现 `Getter`。

### 4. Group.Get：最小闭环

```go
type Group struct {
	name      string
	getter    Getter
	mainCache cache
}

func (g *Group) Get(key string) (ByteView, error) {
	if key == "" {
		return ByteView{}, errors.New("key is required")
	}
	if v, ok := g.mainCache.get(key); ok {
		return v, nil
	}

	data, err := g.getter.Get(key)
	if err != nil {
		return ByteView{}, err
	}
	value := ByteView{b: bytes.Clone(data)}
	g.mainCache.add(key, value)
	return value, nil
}
```

输入：非空 `key`。回源输入：`string`；回源输出：`[]byte, error`。Group 输出：不可变语义的 `ByteView, error`。

### 5. Group 注册表

教学版用 `map[string]*Group` 让 HTTP 节点根据 group 名称找到缓存。读多写少时可用 `sync.RWMutex` 保护注册表；但真实项目更推荐显式注入 `*Group` 或一个明确的 registry，避免隐式全局状态。

## 四、核心原理

### 1. “不可变”比“只读字段”更重要

`ByteView.b` 是包内字段，不代表底层数组天然不可变。真正的保护链是：

```text
数据源返回 []byte
  ↓ clone
缓存持有自己的数组
  ↓ ByteSlice 再 clone
调用方拿到自己的数组
```

直观含义：缓存拥有内部数据的生命周期，调用方只能拿副本。

### 2. 回源抽象的因果关系

如果 Group 直接依赖数据库，缓存就只能服务数据库；通过 `Getter`，缓存只关心“按 key 得到字节或错误”，数据源可替换为数据库、文件、RPC 或计算函数。

### 3. 空值不应随意缓存

回源错误和“确实不存在”不是同一件事。最小教学实现把错误直接返回，不缓存；项目若要防缓存穿透，可单独设计带 TTL 的负缓存，不要把任意错误都缓存。

## 五、常见场景

- **必须有**：任何会被多个请求并发访问的进程内缓存。
- **适合 Getter**：数据源类型可能变化，或者希望用 fake getter 测试缓存行为。
- **不适合只用这层解决**：热点 key 并发回源、跨进程请求合并、数据过期和主动失效；这些要在后续层补上。

## 六、踩坑点

1. **用 `RWMutex` 包住 LRU 的 Get**：如果 Get 会移动节点，多个“读锁”仍会同时写链表。
2. **缓存直接保存外部 `[]byte`**：外部修改会绕过锁和容量统计。
3. **把 getter 返回的错误写入缓存**：可能把暂时性故障变成长期错误。
4. **回源成功但写缓存失败却忽略**：如果缓存层未来支持序列化/容量检查，写回错误应可观测。
5. **空 key 和不存在 key 混淆**：空 key 通常是调用错误；不存在 key 是数据源语义。
6. **全局 groups 重复注册同名 Group**：可能覆盖旧 Group；项目要明确禁止覆盖或实现显式替换。
7. **把 `ByteView` 当成任意可变对象**：如果内部再嵌套 map、slice、指针，仍需复制或约束所有权。

## 七、项目中的实际使用

推荐让缓存层负责缓存流程，让业务层负责数据源和数据解码：

```text
HTTP/RPC Handler
  → Group.Get(key)
  → ByteView.ByteSlice()
  → 解码成业务对象
```

回源函数建议：

- 明确使用 `context.Context` 时，把请求上下文传进业务服务；教学版 `Getter` 没有 context 参数，项目版可升级为 `Get(ctx, key)`。
- 只返回完整、可缓存的字节；部分结果不要写入缓存。
- 用测试 fake 记录调用次数，验证第一次回源、第二次命中。
- 用 `go test -race` 检查并发访问，不以“测试没 panic”代替数据竞争检查。

## 八、一句话总结

**ByteView 管所有权，cache 管并发，Group 管命中/回源/写回，Getter 把数据源从缓存中剥离。**

## 九、核心问答

1. **为什么 ByteView 的 `ByteSlice` 必须返回副本？**  
   因为 `[]byte` 是可变引用，直接返回会让调用方修改缓存内部数据。

2. **为什么 LRU 的 Get 不能简单使用读锁？**  
   因为它会移动链表节点，读 value 的同时修改访问顺序。

3. **GetterFunc 解决了什么问题？**  
   让函数值也能满足 Getter 接口，保留接口抽象但减少一次性结构体样板代码。

4. **Group.Get 未命中时为什么先回源再写缓存？**  
   只有回源成功且数据完整，才有合法缓存值；错误不能被当成正常值写回。

5. **全局 Group 注册表是生产必需的吗？**  
   不是。它主要方便教学版 HTTP 路由查找；生产项目可用依赖注入或显式 registry。

## 十、自测与答案

### 题目

1. `Group.Get` 的命中路径和未命中路径分别经过哪些步骤？
2. 如果 getter 返回的 `[]byte` 后续被数据库驱动复用，为什么缓存仍应安全？
3. 多个 goroutine 同时调用同一个未命中的 key，当前章节的实现会回源几次？
4. 为什么“并发安全的 LRU”不等于“不会缓存击穿”？

<details>
<summary>展开答案</summary>

1. 命中：本地 cache.get → 返回；未命中：getter.Get → clone 成 ByteView → cache.add → 返回。
2. Group 在接收数据时 clone 一份，缓存持有自己的底层数组，不依赖数据源后续的复用。
3. 可能回源多次；锁只保护 LRU 的读写，没有合并“同一 key 正在加载”的请求。
4. 并发安全只保证共享结构不被并发破坏；它没有阻止多个 goroutine 同时发现 miss 并一起访问数据源。

</details>
