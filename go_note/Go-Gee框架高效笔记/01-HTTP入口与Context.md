# HTTP 入口与 Context：把一次请求收拢成可扩展的处理对象

## 一、是什么

`http.Handler` 是 Go Web 服务的统一入口：只要类型实现 `ServeHTTP(http.ResponseWriter, *http.Request)`，就能接收请求。Gee 的 `Engine` 通过实现它，把所有请求先交给框架，再由框架分发。

`Context` 是框架层的请求上下文，把原始请求、响应写入、路由参数和响应状态集中到一个对象中，让业务 Handler 不必重复解析 HTTP 细节。

## 二、为什么需要

没有统一入口时，每条路由都直接绑定标准库 Handler，日志、认证、错误处理会散落在各处；没有 Context 时，每个 Handler 都要重复写查询参数、表单、JSON、状态码和响应头的胶水代码。

框架真正增加的价值是“统一流程和约束”，不是把 `net/http` 藏起来。

## 三、核心用法

### 1. 最小 Engine 闭环（⭐）

```go
type HandlerFunc func(*Context)

type Engine struct {
	routes map[string]HandlerFunc // key: method + "\x00" + path
}

func (e *Engine) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	key := r.Method + "\x00" + r.URL.Path
	h := e.routes[key]
	if h == nil {
		http.NotFound(w, r)
		return
	}
	h(newContext(w, r))
}
```

输入：`*http.Request`；输出：对 `http.ResponseWriter` 的一次响应；入口：`Engine.ServeHTTP`。

启动时优先使用可配置的 `http.Server`：

```go
srv := &http.Server{
	Addr:    ":8080",
	Handler: engine,
}
log.Fatal(srv.ListenAndServe())
```

### 2. Context 的最小形状（⭐）

```go
type Context struct {
	Writer http.ResponseWriter
	Req    *http.Request

	Path   string
	Method string
	Params map[string]string

	StatusCode int
}

func newContext(w http.ResponseWriter, r *http.Request) *Context {
	return &Context{
		Writer: w,
		Req:    r,
		Path:   r.URL.Path,
		Method: r.Method,
		Params: make(map[string]string),
	}
}
```

### 3. 统一响应写法（⭐）

```go
func (c *Context) JSON(code int, v any) error {
	c.Writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	c.StatusCode = code
	c.Writer.WriteHeader(code)
	return json.NewEncoder(c.Writer).Encode(v)
}
```

`any` 是 `interface{}` 的现代别名；输入可以是 struct、map、slice，输出是 JSON 字节流。真正项目中应让编码错误能被上层记录，而不是悄悄吞掉。

## 四、核心原理

### 1. 接口是控制反转

`http.Server` 不需要知道 Engine 的具体类型，只依赖 `Handler` 接口；请求到达时由 Server 回调 `ServeHTTP`。这就是“框架接管流程，业务提供局部函数”的控制反转。

### 2. ResponseWriter 有提交时机

响应大致遵循：

```text
Header 设置 → WriteHeader(status) → Write(body)
```

一旦第一次 `WriteHeader` 或 `Write` 发生，响应头通常就已经发出；之后再改状态码或 Header，客户端大多看不到。直观含义：**状态码和元数据必须先于内容提交**。

### 3. 框架 Context 与标准库 context.Context 不是一回事

- `*gee.Context`：框架方便业务处理 HTTP 的对象。
- `r.Context()`：请求取消、截止时间、跨层传递的请求级上下文。

业务调用数据库、RPC 时应传 `r.Context()`，不要把框架 Context 当成取消信号。

## 五、常见场景

- **必须用**：每个请求都要统一做路由、认证、响应编码、日志和错误处理时。
- **不必重型封装**：只有一两个端点、没有横切逻辑的内部小工具，直接使用 `http.ServeMux` 可能更清晰。
- **不适合塞进 Context**：全局配置、数据库连接池、业务服务对象。它们应通过依赖注入持有，Context 只放请求级数据和少量派生状态。

## 六、踩坑点

1. **先写 body 后设 Header**：`Content-Type`、状态码可能已经提交。
2. **重复 `WriteHeader`**：第二次通常无效，还会出现日志警告或错误响应不一致。
3. **JSON 失败后继续写**：编码错误发生时不要再拼接另一份响应。
4. **把 `Req.FormValue` 当作明确的输入来源**：它会综合 URL query 和表单；接口契约明确时分别读取 `r.URL.Query()` 或解析 JSON body。
5. **共享 Context**：Context 必须一请求一实例，不能放到全局或复用到下一次请求。
6. **Handler 签名混乱**：统一成 `func(*Context)` 后，路由、分组、中间件才能组合。

## 七、项目中的实际使用

推荐把层次固定成：

```text
http.Server
  └── Engine / ServeMux
        └── middleware chain
              └── route handler
                    └── service(ctx.Request.Context(), input)
```

Handler 负责 HTTP 适配：读取并校验输入、调用 service、选择状态码和响应格式。业务规则不要依赖 `ResponseWriter`，否则测试和复用都会变难。

## 八、一句话总结

**`ServeHTTP` 统一接管请求，`Context` 统一封装 HTTP 细节，Handler 只处理当前业务。**

## 九、核心问答

1. **为什么 Engine 只要实现 `ServeHTTP` 就能成为 Web 框架？**  
   因为 `http.Server` 依赖的是 `http.Handler` 接口，不依赖具体类型；Engine 满足接口后就成为所有请求的统一回调入口。

2. **`http.ResponseWriter` 和 `*http.Request` 分别负责什么？**  
   Request 提供输入与请求生命周期；ResponseWriter 负责输出 Header、状态码和 body。

3. **为什么需要把 method 放进路由 key？**  
   同一路径可以对 GET、POST、DELETE 有不同语义；不隔离 method 会把不同操作错误地映射到同一个 Handler。

4. **框架 Context 能替代 `context.Context` 吗？**  
   不能。前者是 HTTP 便利封装，后者负责取消、超时和跨层请求状态。

5. **为什么项目推荐 `http.Server` 而不是只调用 `http.ListenAndServe`？**  
   `http.Server` 能集中配置 Header/读写/空闲超时，并支持优雅关闭；后者更适合教学或极简程序。

## 十、自测与答案

### 题目

1. 从客户端发起请求到业务 Handler 被调用，中间至少经过哪三个关键对象？
2. 如果 Handler 先 `Write([]byte("ok"))`，再 `WriteHeader(500)`，客户端最终大概率看到什么？为什么？
3. 设计一个 `Context.JSON` 方法时，Header、状态码、body 的顺序是什么？
4. 哪些数据适合放在 Context，哪些不适合？各举一例。

<details>
<summary>展开答案</summary>

1. `http.Server` → `Engine.ServeHTTP` → `Context`/Router → Handler；具体实现可以有中间件。
2. 大概率是 200 和 `ok`，因为第一次 Write 会隐式提交 200，后面的 500 已太晚。
3. 设置 Header → 设置/写入状态码 → 编码并写 body。
4. 适合请求路径、方法、路由参数、状态码；不适合数据库连接池、全局配置、跨请求缓存。

</details>

