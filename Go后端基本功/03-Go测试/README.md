# Go 测试：章节总览

## 学习目标

用尽量快、稳定的测试保护业务规则、HTTP 边界、外部依赖集成和并发代码。

## 章节顺序

1. [测试结构、表驱动与边界](./01-测试结构与表驱动.md)
2. [Handler、httptest 与依赖隔离](./02-Handler测试与依赖隔离.md)
3. [集成、竞态与验证闭环](./03-集成竞态与验证闭环.md)

## 先掌握这些

- 普通业务逻辑优先用小型单元测试。
- HTTP 请求和响应优先用 httptest 验证，不必每次启动真实端口。
- 外部依赖用窄接口或测试替身隔离；关键 SQL 和协议再做少量集成测试。
- race detector 能发现一类数据竞争，不能证明程序没有所有并发错误。

## 资料

- [Go 官方测试教程](https://go.dev/doc/tutorial/add-a-test)
- [httptest 标准库](https://pkg.go.dev/net/http/httptest)
- [Learn Go with Tests](https://github.com/quii/learn-go-with-tests)：包含中文翻译；挑测试、并发、context、HTTP 应用和验收测试章节。
