# Handler、httptest 与依赖隔离

## 一、是什么

Handler 测试在进程内构造 HTTP 请求并捕获响应，验证路由、状态码、headers 和 body，而不需要绑定真实端口。

## 二、为什么需要

Handler 是客户端与业务服务的边界。直接用 httptest 可以快速覆盖协议行为，也能避免每个测试依赖数据库或网络。

## 三、核心用法

~~~go
func TestCreateNoteHandler(t *testing.T) {
    h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        var input map[string]string
        if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
            http.Error(w, "invalid JSON", http.StatusBadRequest)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        _ = json.NewEncoder(w).Encode(input)
    })

    req := httptest.NewRequest(http.MethodPost, "/v1/notes",
        strings.NewReader("{\"title\":\"Go\"}"))
    rec := httptest.NewRecorder()

    h.ServeHTTP(rec, req)

    if rec.Code != http.StatusCreated {
        t.Fatalf("status = %d, want %d", rec.Code, http.StatusCreated)
    }
    if got := rec.Header().Get("Content-Type"); got != "application/json" {
        t.Fatalf("content type = %q, want application/json", got)
    }
}
~~~

所需 imports：encoding/json、net/http、net/http/httptest、strings、testing。

## 四、核心原理

- httptest.NewRequest 创建内存中的 request；ResponseRecorder 捕获 Handler 写出的状态、headers 和 body。
- Handler 测试验证 HTTP 层契约，不验证真实 TCP、TLS、代理或数据库。
- 业务层用窄接口注入 fake；fake 返回指定结果，测试成功、NotFound 和依赖失败等分支。
- 需要检验客户端与服务端真实连接行为时，使用 httptest.NewServer，而不是手工监听随机端口。

## 五、常见场景

- 验证 JSON 解析、参数校验、状态码和响应格式。
- 验证 request context 传递、认证中间件和资源权限分支。
- 用 fake 模拟数据库成功、记录不存在、超时或内部错误。

## 六、踩坑点

- Recorder 未显式 WriteHeader 时，第一次写 body 通常会提交默认 200。
- 写响应头或状态码后再修改它们不会覆盖已经发出的值。
- 只断言状态码，不断言关键响应字段和 Content-Type。
- fake 复制了整个数据库行为，变成第二套实现而引入维护成本。
- Handler 测试通过后就断言真实数据库事务正确。

## 七、项目中的实际使用

对同一 Handler 至少覆盖：

| 输入/依赖结果 | 期望 |
| --- | --- |
| 合法 JSON + service 成功 | 2xx、稳定 body、正确 headers |
| JSON 格式错误或字段非法 | 4xx、稳定错误码 |
| 未认证或无资源权限 | 401/403，不泄露资源内容 |
| 资源不存在 | 404 |
| service 返回未知故障 | 5xx、记录内部错误 |

接口测试使用 fake；数据库 SQL、事务和迁移另用集成测试验证。

## 八、一句话总结

**Handler 测试用内存请求检查 HTTP 契约，用窄 fake 隔离业务依赖。**

## 九、核心问答

### 1. ResponseRecorder 能模拟真实网络吗？

不能。它运行 Handler 并捕获写入结果，不建立 TCP/TLS 连接。

### 2. 什么时候用 httptest.NewServer？

需要真实 HTTP Client 与 Server 往返，检查连接、headers 或客户端行为时。

### 3. fake 应该模拟多少行为？

只模拟当前测试需要的契约，保持简单；复杂状态机应由真实集成测试覆盖。

### 4. 为什么验证错误响应也重要？

调用方依赖错误状态与稳定错误码恢复；安全边界也需要确认不会泄露数据。

## 十、自测与答案

1. 如何构造 POST JSON 请求并验证 Handler 的 201 响应？
2. 哪类问题不能靠 ResponseRecorder 测出来？
3. service fake 和真实数据库集成测试分别验证什么？
4. Handler 已写出 body 后还能否可靠更改状态码？

<details>
<summary>参考答案</summary>

1. 用 httptest.NewRequest 创建请求、NewRecorder 捕获响应，再调用 handler.ServeHTTP 并断言 Code、header 和 body。
2. TCP/TLS、代理、真实客户端超时和服务连接管理等网络行为。
3. fake 验证 Handler 与业务依赖契约；集成测试验证真实 schema、SQL、事务和驱动行为。
4. 通常不能；状态码和 headers 在写入后已提交。

</details>

## 资料

- [Go net/http/httptest](https://pkg.go.dev/net/http/httptest)
- [Go 官方：添加测试](https://go.dev/doc/tutorial/add-a-test)
- [Learn Go with Tests：HTTP handlers](https://github.com/quii/learn-go-with-tests)
