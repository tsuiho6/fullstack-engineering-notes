# 网络与 HTTP：章节总览

## 学习目标

把“域名、连接、协议、Handler”串成一条因果链，知道如何设置期限并定位常见请求失败。

## 章节顺序

1. [一次请求的链路：DNS、TCP、TLS](./01-请求链路.md)
2. [HTTP 消息、方法与连接复用](./02-HTTP语义与连接.md)
3. [Go 网络调用、超时取消与排障](./03-Go网络调用与排障.md)

## 先掌握这些

- TCP 是有序字节流，不替 HTTP 保留消息边界。
- HTTP 定义请求和响应语义；TLS 为连接提供加密与身份验证。
- 超时要逐层传递；客户端放弃等待不自动终止服务端的工作。
- Go 的 Client/Transport 通常复用；响应体要关闭。

## 暂时只需理解

HTTP/2 帧、QUIC/HTTP/3、TLS 握手细节与 TCP 拥塞控制知道解决什么问题即可；当前不要求实现协议栈。

## 最小验收

能用一段话解释一次 HTTPS 请求的路径；能看懂 curl 输出中的解析、连接、TLS、状态码阶段；能为 Go 请求配置 context deadline。

## 资料

- [MDN：HTTP 概述](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Overview)
- [Go net 包](https://pkg.go.dev/net) 与 [Go net/http 包](https://pkg.go.dev/net/http)
- 可选的 socket 原理补充：[Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)。示例用 C，重点读 socket 与 TCP 的概念，不必照着学 C。
