# Panic 恢复与健壮性：让单个请求失败，不拖垮整个服务

## 一、是什么

`panic` 是 Go 的异常式控制流：当前 goroutine 的正常执行被中断，沿调用栈展开；只有同一 goroutine 中的 `defer` 才能通过 `recover()` 捕获。

Web 框架的 Recovery 中间件在请求边界设置 `defer`，捕获未处理 panic，记录堆栈，并返回通用 500 响应。

## 二、为什么需要

没有请求级 Recovery，一个 Handler 的数组越界、nil 解引用或第三方库 panic 可能让整个 HTTP 连接异常，甚至终止服务进程。

Recovery 不能替代错误处理；它是最后一道边界，目标是保护服务和用户，不是把 panic 当作正常业务返回机制。

## 三、核心用法

### 1. 最小 Recovery 中间件（⭐）

```go
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Printf("panic=%v\n%s", v, debug.Stack())
				http.Error(w, "internal server error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

输入：下游 `http.Handler`；输出：正常响应或统一 500；日志：保留内部 panic 和堆栈，但响应不暴露内部细节。

### 2. Gee 风格的中间件版本

```go
func Recovery() HandlerFunc {
	return func(c *Context) {
		defer func() {
			if v := recover(); v != nil {
				log.Printf("panic=%v\n%s", v, debug.Stack())
				c.Fail(http.StatusInternalServerError, "Internal Server Error")
			}
		}()
		c.Next()
	}
}
```

关键点不是 `trace` 函数本身，而是：`defer` 设置在 `Next()` 之前，Recovery 才能包住整个下游链。

## 四、核心原理

### 1. `recover` 的有效位置

`recover()` 只能在 deferred function 中、同一 goroutine 的 panic 展开过程中生效。下面两种情况都抓不到目标 panic：

- 在另一个 goroutine 中调用 `recover`；
- panic 已经被捕获或当前函数没有处于 defer 展开阶段。

### 2. 为什么错误响应可能无法覆盖

如果下游已经写出 Header 或 body，响应已经部分提交；此时 Recovery 再调用 `http.Error`，可能只能追加错误文本，无法把状态码可靠改成 500。

直观结论：**Recovery 能保证不让 panic 逃出请求边界，但不保证撤销已经发出的响应字节。**

对必须原子返回的场景，可在框架层使用响应缓冲器，先缓存下游输出，成功后再提交；代价是内存占用、流式响应不兼容和实现复杂度增加。

### 3. panic、error、客户端错误的边界

| 情况 | 推荐机制 |
|---|---|
| 参数格式不合法 | 返回 `error`/4xx |
| 资源不存在 | 返回 404 |
| 权限不足 | 返回 401/403 |
| 下游调用失败 | 显式处理 error，按服务语义返回 |
| 不可预期的程序缺陷 | 允许 panic，由 Recovery 兜底并告警 |

## 五、常见场景

- **必须有**：公共 HTTP 服务、插件代码、第三方库较多的服务。
- **适合全局注册**：Recovery 应覆盖所有业务路由和大多数框架代码。
- **不适合滥用**：把可预期业务失败写成 panic，会让日志报警失真，也增加调试成本。
- **流式/升级连接**：SSE、WebSocket、已提交的长响应要单独设计恢复策略。

## 六、踩坑点

1. **Recovery 不在最外层**：某些中间件或路由前置逻辑的 panic 可能未被捕获。
2. **把 panic 内容直接返回客户端**：会泄露路径、SQL、密钥或内部实现。
3. **只打印 `v` 不打印堆栈**：没有调用路径，线上定位困难；至少记录 `debug.Stack()`。
4. **panic 后继续执行业务收尾**：恢复流程应明确是否还能写响应，避免二次写入。
5. **把进程级 fatal 当 panic**：`os.Exit`、运行时致命错误等不一定能被 Recovery 处理。
6. **忽略请求取消**：客户端断开应通过 `r.Context().Done()` 让下游停止，不要用 panic 表示取消。
7. **日志没有 request ID**：堆栈和访问日志难以关联，生产环境要把请求 ID 带入日志字段。

## 七、项目中的实际使用

推荐默认链：

```go
engine.Use(
	RequestID(),
	Recovery(),
	AccessLog(),
)
```

顺序上，Recovery 要包住 AccessLog 和业务 Handler；AccessLog 在返回后记录最终状态；真正的错误细节进入结构化日志和监控，客户端只拿稳定错误码/消息。

测试至少覆盖：

```go
func TestRecovery(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/panic", nil)
	w := httptest.NewRecorder()
	h := Recovery(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))
	h.ServeHTTP(w, r)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", w.Code)
	}
}
```

## 八、一句话总结

**Recovery 是请求边界的最后防线：捕获同 goroutine 的未处理 panic，记录堆栈，返回稳定错误，但不能撤销已提交的响应。**

## 九、核心问答

1. **为什么 `recover` 必须放在 `defer` 中？**  因为它只有在同一 goroutine 的 panic 展开阶段由 deferred function 调用才有效。
2. **Recovery 能不能把已经写出的 200 改成 500？**  不可靠；Header/body 一旦提交就不能完整回滚。
3. **参数校验失败应该 panic 还是返回 error？**  返回明确的 4xx/error；panic 只兜底不可预期的程序缺陷。
4. **为什么响应不应返回 panic 原文？**  可能泄露内部路径、SQL、凭据和实现信息。
5. **Recovery 与 `context.Context` 分别解决什么？**  Recovery 处理异常控制流；Context 处理取消、截止时间和请求生命周期。

## 十、自测与答案

### 题目

1. Recovery 中 `defer` 应放在 `Next()` 之前还是之后？
2. 如果 Handler 已经写出部分 body 后 panic，Recovery 最可靠能保证什么？
3. 业务中“用户不存在”为什么不应该用 panic 表示？
4. 另一个 goroutine 中发生的 panic，当前请求的 Recovery 能直接 recover 吗？
5. 测试 Recovery 至少应断言哪一个外部行为？

<details>
<summary>展开答案</summary>

1. 之前；这样 defer 才能包住整个下游调用。
2. 捕获 panic、记录日志并避免 panic 继续逃出请求边界；无法保证撤销已经提交的字节。
3. 它是可预期业务分支，应返回 404/error，不能污染 panic 告警。
4. 不能；必须在发生 panic 的同一 goroutine 中设置 defer/recover。
5. 请求不会把 panic 传播出去，并按约定返回 500（在尚未提交响应的前提下）。

</details>

