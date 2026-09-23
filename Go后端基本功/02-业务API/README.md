# 业务 API：章节总览

## 学习目标

把 HTTP 端点设计成稳定的业务契约；请求解析、权限检查、业务规则、数据访问和响应转换各有边界。

## 章节顺序

1. [资源、方法与 API 契约](./01-资源与HTTP语义.md)
2. [Go Handler 与请求边界](./02-GoHandler与分层.md)
3. [错误、权限、幂等与项目闭环](./03-错误权限幂等与闭环.md)

## 先掌握这些

- 路径表达资源；HTTP 方法表达对资源的操作。
- Handler 负责协议边界，业务逻辑负责规则，数据层负责持久化。
- 服务端校验输入并检查授权；认证成功不等于有权访问任意资源。
- 错误响应应稳定，不把内部异常原样暴露给调用者。

## 教学演示与项目写法

先用 Go 标准库理解 Handler 和 request/response，再按需用 Gin 简化路由与绑定。自建 Gee 用于学习框架机制，业务项目选标准库或成熟框架，不自行发明完整框架。

## 资料

- [Go 官方：用 Gin 开发 REST API](https://go.dev/doc/tutorial/web-service-gin)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)：参考资源命名、错误、分页和重试设计；其中 Azure 规范是组织约定，不是所有 API 的强制标准。
