# Go Handler 与请求边界

## 一、是什么

Handler 是 HTTP 协议与业务程序之间的适配层：把不可信请求解析成业务输入，再把业务结果转换成状态码、headers 和响应体。

## 二、为什么需要

如果 Handler 同时解析协议、查数据库、执行业务规则、拼 SQL 和生成响应，测试困难，错误边界混乱，业务也难以复用。

## 三、核心用法

Go 1.22+ 标准库 ServeMux 支持 method 与路径变量：

~~~go
type Note struct {
    ID    string
    Title string
}

type Server struct {
    notes NoteService
}

func (s *Server) Routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /v1/notes/{id}", s.getNote)
    mux.HandleFunc("POST /v1/notes", s.createNote)
    return mux
}

func (s *Server) getNote(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    note, err := s.notes.Get(r.Context(), id)
    if err != nil {
        writeAPIError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, note)
}
~~~

依赖方向：

~~~text
HTTP Handler → NoteService 接口 → 业务实现 → Repository/数据库
~~~

## 四、核心原理

- Request Context 携带取消、期限和请求范围数据，向下游传递。
- Handler 只读取并验证边界输入；业务规则应在 service 中再次保持一致。
- 窄接口让测试可注入 fake，也避免每层暴露全部数据库能力。
- JSON 解码只是语法解析；必填、长度、范围、跨字段约束仍需业务校验。

## 五、常见场景

- 认证中间件提取身份，业务服务检查对具体资源的授权。
- Handler 为请求设置最大 body 大小，拒绝畸形或过大的输入。
- service 使用 context 调数据库和 RPC；客户端断开后及时停止可取消的工作。

## 六、踩坑点

- 把 <code>context.Background()</code> 传给每个下游，切断请求取消链。
- 认为 JSON 解析成功就表示输入合法。
- 把整个数据库对象传进 Handler，让 Handler 自己随意执行 SQL。
- 写完响应后继续写第二个状态码；HTTP headers 通常已发出。
- 在每个包重复编写不同的错误 JSON shape。

## 七、项目中的实际使用

常见处理顺序：

1. 限制 body 大小并解析 JSON。
2. 验证字段与业务约束。
3. 识别调用者并检查对目标资源的权限。
4. 调用 service，传递 request context。
5. 将 service 结果映射成稳定 HTTP 响应。

标准库足以完成基础 API。团队已有 Gin 时可用它路由和中间件；要先理解 Handler 契约，避免把框架 API 当 HTTP 原理。

## 八、一句话总结

**Handler 负责协议边界，Service 负责业务规则，Repository 负责数据存取。**

## 九、核心问答

### 1. Handler 里为什么要传 r.Context()？

它让下游工作与请求生命周期绑定，客户端断开或期限到达时可以取消。

### 2. 认证和授权的区别是什么？

认证回答“你是谁”；授权回答“你能不能操作这个资源”。

### 3. 解码成功为什么还需要校验？

JSON 语法合法不代表字段满足必填、长度、范围和业务不变量。

### 4. 小项目是否必须拆很多层？

不必。边界按变化和测试需要拆开；Handler 与业务规则混写到难测时再提取 service。

## 十、自测与答案

1. 一次创建请求从 Handler 到持久层的顺序是什么？
2. 为什么不能信任前端传来的 user_id 来判断资源所有权？
3. 哪些数据适合放进 request context？
4. 何时使用标准库，何时采用 Gin？

<details>
<summary>参考答案</summary>

1. 限制和解析请求 → 校验 → 认证/授权 → service 规则 → repository → 转成响应。
2. 客户端能任意改请求字段；服务端必须从可信身份上下文取调用者并检查资源权限。
3. 取消信号、期限和请求范围的身份/追踪信息；不放可选业务参数或全局配置。
4. 小型基础服务用标准库很合适；团队已有框架约定或项目需要路由生态时用 Gin。

</details>

## 资料

- [Go 官方：REST API with Gin](https://go.dev/doc/tutorial/web-service-gin)
- [Go net/http](https://pkg.go.dev/net/http)
- [Go net/http/httptest](https://pkg.go.dev/net/http/httptest)
