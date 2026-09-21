# LRU 与缓存淘汰：用有限内存保住高命中率

> 优先级：⭐ 必须掌握

## 一、是什么

LRU（Least Recently Used，最近最少使用）在容量不足时淘汰“最长时间没有被访问”的条目。它假设：最近访问过的数据，短时间内再次访问的概率更高。

GeeCache 的 LRU 由两部分组成：`map` 负责按 key 快速定位，双向链表负责维护访问顺序。

## 二、为什么需要

单独使用 `map[string]Value` 只能解决查找问题，不能解决：

- 内存无限增长；
- 超限时应该淘汰谁；
- 访问一个已有 key 后，如何把它提升为“最近使用”。

常见策略对比：

| 策略 | 淘汰依据 | 优点 | 主要问题 |
|---|---|---|---|
| FIFO | 最早加入 | 最简单 | 早加入但仍热门的数据会被误删 |
| LFU | 历史访问次数最少 | 对稳定热点有效 | 计数和排序成本高，旧热点可能长期霸占位置 |
| LRU | 最近最久未访问 | 结构简单，能适应热点变化 | 对扫描型访问、突发热点不一定理想 |

## 三、核心用法

### 1. 最小数据结构

```go
type Value interface {
	Len() int // 参与容量统计的近似字节数
}

type entry struct {
	key   string
	value Value
}

type Cache struct {
	maxBytes  int64
	nbytes    int64
	ll        *list.List              // front = 最近使用，back = 最久未使用
	cache     map[string]*list.Element // key → 链表节点
	OnEvicted func(string, Value)
}
```

输入：`string key + Value value`。输出：按 key 找到的 `Value`，或者淘汰事件。`maxBytes == 0` 通常表示不设容量上限。

### 2. 查询与提升

```go
func (c *Cache) Get(key string) (Value, bool) {
	ele, ok := c.cache[key]
	if !ok {
		return nil, false
	}
	c.ll.MoveToFront(ele) // 访问即变成 MRU
	return ele.Value.(*entry).value, true
}
```

`map` 查找是 O(1)，链表移动也是 O(1)。这里约定 `front` 是 MRU，`back` 是 LRU；“队首/队尾”不是算法结论，而是实现约定。

### 3. 新增、更新与淘汰

```go
func (c *Cache) Add(key string, value Value) {
	if ele, ok := c.cache[key]; ok {
		c.ll.MoveToFront(ele)
		kv := ele.Value.(*entry)
		c.nbytes += int64(value.Len() - kv.value.Len())
		kv.value = value
	} else {
		ele := c.ll.PushFront(&entry{key: key, value: value})
		c.cache[key] = ele
		c.nbytes += int64(len(key) + value.Len())
	}
	for c.maxBytes > 0 && c.nbytes > c.maxBytes {
		c.RemoveOldest()
	}
}

func (c *Cache) RemoveOldest() {
	ele := c.ll.Back()
	if ele == nil {
		return
	}
	c.ll.Remove(ele)
	kv := ele.Value.(*entry)
	delete(c.cache, kv.key)
	c.nbytes -= int64(len(kv.key) + kv.value.Len())
	if c.OnEvicted != nil {
		c.OnEvicted(kv.key, kv.value)
	}
}
```

### 4. 复杂度

| 操作 | 复杂度 | 原因 |
|---|---:|---|
| Get | O(1) | map 定位 + 链表移动 |
| Add/更新 | O(1) | map 写入 + 链表移动/插入 |
| RemoveOldest | O(1) | 取 `Back` 并删除 |
| 空间 | O(n) | map 和链表各保存一份索引关系 |

## 四、核心原理

### 1. 为什么必须同时维护 map 和链表

只有链表，查找 key 要 O(n)；只有 map，没有访问顺序。两者组合后：

```text
key ──map──→ list.Element ──→ entry{key, value}
                         ↘ MoveToFront / Remove
```

直观含义：map 解决“我在哪里”，链表解决“谁该先被淘汰”。

### 2. 容量统计公式

```text
nbytes = Σ(len(key) + value.Len())
```

它统计的是缓存条目内容的近似大小，不是 Go 进程的完整堆占用；map、链表节点、对象头和分配器碎片都可能未计入。

### 3. 更新为什么要做差值

如果同一个 key 更新 value，条目数量没有增加，但 value 大小可能变化：

```text
nbytes' = nbytes + newValue.Len() - oldValue.Len()
```

不做差值会让容量统计逐渐失真，最终出现“明明更新却越来越超限”或“统计没有减少”的错误。

## 五、常见场景

- **适合**：内存型热点缓存、连接/对象复用、需要容量上限但不要求持久化的数据。
- **不适合单独解决**：数据过期、跨节点一致性、持久化、强一致读写。
- **读多写少但 Get 会改顺序**：LRU 的查询不是纯读操作，不能默认用 `RWMutex` 把所有 Get 当成并发读。

## 六、踩坑点

1. **只删链表不删 map**：map 会保留失效节点指针，查找结果和链表不一致。
2. **只删 map 不删链表**：链表继续占内存，后续淘汰还可能读到脏 entry。
3. **更新后忘记调整 `nbytes`**：容量控制失效。
4. **把 `front` 当成 LRU**：本实现中 `front` 是最近使用，真正淘汰 `Back()`。
5. **把 LRU 当作线程安全**：原始 LRU 不安全；并发保护应放在外层或封装内部。
6. **认为 `Len()` 等于内存大小**：`Len()` 通常只是条目数，`nbytes` 才是容量近似值。
7. **允许外部直接修改 value**：如果 value 是可变切片，外部改它可能绕过容量统计和数据保护。
8. **单条记录大于 `maxBytes`**：按“加入后立刻淘汰”的实现，它可能根本留不住；项目需明确这一语义。

## 七、项目中的实际使用

教学版可以直接把 `ByteView` 作为 `Value`。项目里建议：

1. 缓存层只接受不可变值或复制后的值。
2. 明确容量单位：是近似字节数、条目数，还是两者都限制。
3. 给淘汰回调加指标，不在回调里做不可控的慢 I/O。
4. 高并发场景按 key 分片，减少一把全局锁的竞争；不要先优化，先用基准测试证明锁是瓶颈。
5. 如果需要 TTL，单独增加过期判断或选择已有库；LRU 解决的是容量淘汰，不是时间过期。

## 八、一句话总结

**map 让你 O(1) 找到条目，双向链表让最近访问顺序可维护，超限时从 `Back()` 淘汰。**

## 九、核心问答

1. **为什么 LRU 需要 map 和双向链表两种结构？**  
   map 做 O(1) 定位，链表做 O(1) 移动、插入和淘汰；少一种都会让另一项退化。

2. **为什么更新已有 key 时不能把 `nbytes` 直接加上新值大小？**  
   因为旧值已经占过空间，必须加“新大小 − 旧大小”。

3. **LRU 和 TTL 是一回事吗？**  
   不是。LRU 按访问顺序和容量淘汰；TTL 按时间判断是否过期，两者通常需要组合。

4. **为什么 LRU 的 Get 也可能要加锁？**  
   因为 Get 会把节点移动到链表前端，修改了共享状态。

5. **`maxBytes == 0` 应该表示什么？**  
   教学实现通常表示不限制容量；项目必须在文档和测试中固定这个约定。

## 十、自测与答案

### 题目

1. 只用 map 实现 LRU，哪一步会退化，为什么？
2. 访问顺序为 `A → B → A`，容量只能放 2 个条目，再加入 `C` 后淘汰谁？
3. 更新同一个 key 的 value 后，容量统计应如何变化？
4. 为什么缓存层不应直接把内部 `[]byte` 返回给调用方？

<details>
<summary>展开答案</summary>

1. 找到并删除最久未使用条目需要扫描所有 key，退化为 O(n)。
2. 淘汰 B；最后访问顺序是 `A(MRU), B(LRU)`。
3. `nbytes += newLen - oldLen`，key 大小不重复计算。
4. 调用方可能修改切片，导致缓存内容被悄悄改变；应返回副本或不可变包装。

</details>
