# HTTP 传输适配：CONNECT 之后仍然是 RPC

> 优先级：△ 理解即可

## 一、是什么

GeeRPC 的 HTTP 支持不是把每个 RPC 请求改成 REST/JSON，而是先用 HTTP CONNECT 建立一条通道，再在这条通道上继续传输原有 RPC 字节流。

```text
HTTP CONNECT /_geerpc_
  ↓ 200 Connected
同一连接切换为 Option + Header + Body 的 RPC 流
```

## 二、为什么需要

有些部署环境只允许服务通过 HTTP 入口暴露，或者希望在同一个端口上同时提供：

- RPC 通道；
- Debug 页面；
- 健康检查和指标接口。

CONNECT 的价值是做协议升级/隧道建立，不是让 RPC 获得浏览器友好的 JSON 语义。

## 三、核心用法

### 1. 服务端入口

现代化的最小骨架是 `http.Handler` 配合连接劫持：

```go
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodConnect || r.URL.Path != "/_geerpc_" {
		http.NotFound(w, r)
		return
	}

	hj, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "hijacking not supported", http.StatusHTTPVersionNotSupported)
		return
	}
	conn, rw, err := hj.Hijack()
	if err != nil {
		return
	}
	if _, err := io.WriteString(rw, "HTTP/1.1 200 Connected to GeeRPC\r\n\r\n"); err != nil {
		_ = conn.Close()
		return
	}
	go s.ServeConn(conn)
}
```

输入：HTTP CONNECT 请求。输出：成功后把底层连接交给 RPC 服务端；从此不再按普通 HTTP request/response 解析 RPC 数据。

### 2. 客户端入口

```go
func dialHTTP(ctx context.Context, addr string) (net.Conn, error) {
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, err
	}

	if _, err := fmt.Fprintf(conn,
		"CONNECT /_geerpc_ HTTP/1.1\r\nHost: %s\r\n\r\n", addr); err != nil {
		_ = conn.Close()
		return nil, err
	}
	resp, err := http.ReadResponse(bufio.NewReader(conn), &http.Request{Method: http.MethodConnect})
	if err != nil || resp.StatusCode != http.StatusOK {
		_ = conn.Close()
		return nil, fmt.Errorf("rpc http connect failed: %s", resp.Status)
	}
	return conn, nil
}
```

实际项目可直接使用成熟 RPC 框架提供的 HTTP/2 传输，不建议自行复制一个不完整的 CONNECT 客户端。

### 3. Debug 页面

Debug 页面应是独立的 HTTP 路由，例如 `/debug/geerpc`，只展示服务名、方法名、调用次数和延迟等非敏感信息。库代码不要默认修改全局 `http.DefaultServeMux`，更推荐返回一个可组合的 `http.Handler`。

## 四、核心原理

### 1. HTTP CONNECT 的边界

```text
HTTP 层：只负责协商“通道已建立”
RPC 层：负责 Option、Codec、Header、Body 和 Seq
```

两层各自有状态机。CONNECT 成功之后，双方必须同时切换到 RPC 解析状态；一方继续按 HTTP 解码，另一方已经按 Gob/Protobuf 解码，就会立刻失步。

### 2. 为什么普通 GET/POST 不等价

普通 HTTP 请求通常“一次请求对应一个 HTTP 响应”，而 GeeRPC 连接需要：

- 一次 Option；
- 多个请求/响应复用；
- 可能乱序的响应；
- 自定义 Codec 和 Seq。

因此 HTTP 在这里是传输适配层，不是 RPC 方法模型本身。

## 五、常见场景

- **适合 CONNECT**：教学演示、兼容特定 HTTP 入口、需要在同端口承载 Debug 路由。
- **适合普通 HTTP JSON**：浏览器、公开 API、第三方集成。
- **适合 gRPC**：现代多语言内部 RPC，通常依赖 HTTP/2、Protobuf 和生成代码。
- **不适合自行 hijack**：需要 HTTP/2、代理、TLS、流控和完善可观测性时，优先成熟方案。

## 六、踩坑点

1. **CONNECT 成功后继续使用原 `http.Request` 语义**：协议层已经切换，后续是原始字节流。
2. **忽略 HTTP/2 限制**：`http.Hijacker` 不适用于 HTTP/2；部署协议要提前确认。
3. **状态码后才设置 header**：HTTP 写出后再改 header 不会生效。
4. **忘记关闭连接或 response body**：客户端失败路径会泄漏资源。
5. **在库里注册全局 handler**：多个服务或测试会互相污染；用 `ServeMux` 显式组合。
6. **Debug 页面暴露内部信息**：不要把地址、参数、凭证或用户数据直接展示给未授权访问者。
7. **把 HTTP 入口当成安全层**：仍需要 TLS、认证、授权、限流和最大请求限制。

## 七、项目中的实际使用

如果项目只需内部 RPC，建议优先采用成熟的 gRPC/Protobuf 或组织内标准框架。若必须做自定义适配：

- 用 `http.Server` 明确配置 `ReadHeaderTimeout`、`IdleTimeout` 和优雅关闭；
- 连接建立与 RPC 调用都绑定 context/超时；
- 明确支持 HTTP/1.1 还是 HTTP/2，不以“本地能跑”作为协议兼容证明；
- Debug、健康检查、指标与 RPC 通道分开授权；
- 测试错误方法、错误 path、错误状态码、连接中断和半开连接。

## 八、一句话总结

**HTTP CONNECT 只负责把 HTTP 入口升级成一条连接，真正的 RPC 消息格式和并发语义仍由 RPC 协议负责。**

## 九、核心问答

1. **HTTP CONNECT 成功后，RPC 请求还是 HTTP 请求吗？**  
   不再按普通 HTTP 请求处理；CONNECT 只是完成通道协商，后续传输的是 RPC 字节流。

2. **为什么 HTTP 和 RPC 可以共用一个端口？**  
   通过 path/method 分流：CONNECT 交给 RPC，其他 path 交给 Debug、健康检查等 handler。

3. **为什么不直接用 POST 承载每一次 RPC？**  
   可以，但那会改变连接复用、消息边界和响应关联的设计；GeeRPC 的教学目标是保留原 RPC 长连接协议。

4. **HTTP/2 下还能照搬 `Hijacker` 吗？**  
   不能直接照搬；HTTP/2 的连接模型不同，应使用适配它的成熟协议实现。

## 十、自测与答案

### 题目

1. CONNECT 返回 200 后，客户端和服务端下一步必须保持什么一致？
2. Debug 页面为什么不应和 RPC 字节流共用一个 handler 分支？
3. 如果客户端收到非 200 的 CONNECT 响应，应继续发送 Option 吗？

<details>
<summary>展开答案</summary>

1. 双方必须同时切换到同一 RPC 协议状态，并使用兼容的 Codec/framing。
2. Debug 页面是普通 HTTP 语义，RPC 分支是原始字节流语义；混用会导致解析器错位。
3. 不应；通道协商失败，继续发送 RPC 数据只会制造无意义的协议错误。

</details>
