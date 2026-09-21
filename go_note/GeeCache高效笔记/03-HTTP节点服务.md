# HTTP 节点服务：让缓存节点成为可访问的 Peer

> 优先级：⭐ 必须掌握

## 一、是什么

HTTP 节点服务是缓存节点暴露给其他节点的访问入口。GeeCache 让 `HTTPPool` 实现 `http.Handler`，通过 `ServeHTTP` 接收请求、解析 group/key、调用 Group，再把缓存值写回响应。

它解决的是“节点能不能被访问”，还没有解决“应该访问哪个节点”。节点选择由一致性哈希负责。

## 二、为什么需要

单机 Group 只能从本机 LRU 或本机 Getter 取值。分布式后，一个节点 miss 时需要向 owner 节点请求，否则：

- 每个节点都可能重复回源；
- 同一份数据分散复制，命中率和内存利用率下降；
- 节点无法形成统一的缓存拓扑。

## 三、核心用法

### 1. 教学版最小路由

协议形状：

```text
GET /_geecache/<group>/<key>
输入：URL path
输出：200 + application/octet-stream + 原始 []byte
```

```go
const basePath = "/_geecache/"

type HTTPPool struct {
	self     string
	basePath string
}

func (p *HTTPPool) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, p.basePath) {
		http.NotFound(w, r)
		return
	}

	parts := strings.SplitN(strings.TrimPrefix(r.URL.Path, p.basePath), "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	group := GetGroup(parts[0])
	if group == nil {
		http.Error(w, "no such group", http.StatusNotFound)
		return
	}

	view, err := group.Get(parts[1])
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = w.Write(view.ByteSlice())
}
```

关键输入输出：`path → (group, key) → ByteView → []byte`。`ByteSlice()` 保证服务端不会把缓存内部切片直接交给 `ResponseWriter`。

### 2. 当前项目的服务启动

```go
srv := &http.Server{
	Addr:              addr,
	Handler:           pool,
	ReadHeaderTimeout: 2 * time.Second,
	IdleTimeout:       60 * time.Second,
}
```

项目中还应使用优雅关闭、日志、健康检查和明确的 peer 鉴权；`http.ListenAndServe` 只适合教学或极简程序。

## 四、核心原理

### 1. `http.Handler` 是节点协议的入口

`http.Server` 只依赖：

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

因此 HTTPPool 可以同时承担服务端协议解析和缓存查询，不需要让 HTTP 层知道 LRU 的细节。

### 2. 服务端主流程

```text
校验路径前缀
  → 拆出 group/key
  → 查找 Group
  → Group.Get(key)
  → 选择响应编码
  → 写状态码、Header、body
```

直观含义：HTTP 层只做协议适配，缓存层仍然拥有命中/回源逻辑。

### 3. 路径协议不是任意 key 的天然安全容器

教学版 key 如 `Tom`、`Jack` 很简单；如果 key 可能包含 `/`、百分号、Unicode、空格或很长内容，路径拆分和编码/解码规则必须明确。更稳妥的项目选择是：

- 简单字符串 key：路径参数，但严格限制字符集和长度；
- 任意字符串 key：查询参数或 Protobuf 请求体；
- 二进制 key：不要直接塞进 URL path。

## 五、常见场景

- **适合**：内网缓存节点之间的轻量访问、调试方便、已有 HTTP 基础设施。
- **不适合直接暴露公网**：缓存内容通常没有鉴权、限流和租户隔离；内部协议不等于安全协议。
- **不应承担**：大文件传输、复杂事务、强一致写操作。GeeCache 是读缓存路径，不是数据库替代品。

## 六、踩坑点

1. **前缀不匹配直接 panic**：服务端应返回明确错误或单独路由，避免一个异常请求杀掉服务进程。
2. **先 `Write` 再设 Header**：状态码和 Content-Type 可能已提交。
3. **把非 2xx 当成正常字节值**：客户端必须先检查状态码，再解码 body。
4. **key 含 `/` 导致错误拆分**：`SplitN` 只是教学简化，不是通用编码方案。
5. **响应体没有长度上限**：远端异常或恶意响应可能吃光内存；项目应使用 `io.LimitReader` 或 `http.MaxBytesReader`。
6. **服务端调用 Group 后没有超时语义**：Getter 或下游卡住会拖住 peer 请求；项目版要传递请求 context。
7. **节点协议与业务 API 混用**：建议独立 base path、鉴权和指标，避免业务路由误打到内部接口。
8. **直接使用默认 `http.DefaultServeMux`**：多个服务或测试时容易产生隐式全局注册；优先显式创建 mux/Server。

## 七、项目中的实际使用

推荐把内部协议固定成一个小的适配层：

```text
HTTP handler
  ├─ 鉴权/来源校验
  ├─ 限制请求尺寸与 key 长度
  ├─ 解析协议
  ├─ 调用 Group
  ├─ 编码响应
  └─ 记录 peer、group、key hash、耗时、状态码
```

客户端侧应：

- 复用一个 `http.Client` 和 Transport；
- 用 `http.NewRequestWithContext` 绑定超时/取消；
- `defer resp.Body.Close()`；
- 检查状态码后再 `io.ReadAll`；
- 限制响应体大小；
- 不把原始 key 写进日志，必要时记录 hash 或脱敏值。

## 八、一句话总结

**HTTPPool 只负责把 `(group, key)` 适配成一次远程缓存读取，选择哪个节点和缓存如何回源是更上层的事。**

## 九、核心问答

1. **HTTP 服务端解决了分布式缓存中的哪一个问题？**  
   解决节点之间如何访问；它不负责决定 key 应该落到哪个节点。

2. **为什么内部节点接口要有独立的 base path？**  
   为了隔离业务 API、明确协议边界、便于鉴权和路由管理。

3. **客户端为什么必须先检查 HTTP 状态码再解码？**  
   因为 404/500 的 body 通常是错误文本，不符合缓存值或 Protobuf 的数据形状。

4. **为什么项目推荐复用 `http.Client`？**  
   `Client` 和 Transport 可并发安全使用，复用能利用连接池和 keep-alive，减少每次请求建立连接的成本。

5. **HTTP 节点协议可以直接对公网开放吗？**  
   不应默认这样做；至少需要鉴权、网络隔离、限流、超时和响应大小限制。

## 十、自测与答案

### 题目

1. `/_geecache/scores/Tom` 经过服务端后，最终调用哪个 Group 方法？
2. 如果远端返回 500，但 body 里刚好是合法缓存字节，客户端应不应该当成命中？
3. 为什么 `http.Client` 复用和 `Group` 的本地缓存是两个不同层次的优化？
4. 如果 key 可能包含 `/`，你会如何调整协议？

<details>
<summary>展开答案</summary>

1. 解析出 `group=scores`、`key=Tom`，再调用 `GetGroup("scores").Get("Tom")`。
2. 不应该。HTTP 状态码表示协议层失败，body 不满足成功响应契约。
3. Client 复用优化节点间网络连接；Group 缓存优化数据源访问，两者分别减少网络成本和回源成本。
4. 改用 query/body/Protobuf 承载 key，或严格定义转义规则并在服务端使用对应的 escaped path 处理。

</details>
