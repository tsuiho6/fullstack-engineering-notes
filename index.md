# 全栈工程学习笔记

这里记录我在全栈工程方向上的学习、实践与复盘。

内容会从 Go 语言、数据结构与算法开始，逐步扩展到 Web 工程、数据库、缓存、RPC、性能分析、前端工程和 LLM / Agent 工程。

我更关心一条知识能不能形成闭环：

1. 它解决什么问题？
2. 核心约束和不变量是什么？
3. 最小实现如何写？
4. 哪些边界最容易出错？
5. 如何用测试、基准或实验验证？

## 学习路线

当前主线是：

```text
Go 语言主干
    ↓
数据结构与算法
    ↓
Web / ORM 工程
    ↓
缓存 / RPC / 服务治理
    ↓
性能分析与项目化验证
```

推荐从 [Go 语言简明教程](/go_note/Go语言简明教程) 开始，然后阅读 [数据结构笔记](/hello_go/hello-algo-数据结构笔记/README) 和 [算法笔记](/hello_go/hello-algo-算法高效笔记/README)。

## 当前内容

### Go 基础与工程

- [Go 语言简明教程](/go_note/Go语言简明教程)
- [Go 高性能编程](/go_note/Go语言高性能编程/Go语言高性能编程-总目录与最小闭环)
- [Gee Web 框架](/go_note/Go-Gee框架高效笔记/00-总目录与学习路线)
- [GeeORM](/go_note/Go-GeeORM高效笔记/00-总目录与最小闭环)
- [GeeCache](/go_note/GeeCache高效笔记/00-总目录与最小闭环)
- [GeeRPC](/go_note/GeeRPC高效笔记/00-总目录与最小闭环)
- [Go 语言笔试面试题](/go_note/Go语言笔试面试题/00-总目录与学习路线)

### 数据结构与算法

- [数据结构笔记](/hello_go/hello-algo-数据结构笔记/README)
- [算法笔记](/hello_go/hello-algo-算法高效笔记/README)

## 笔记方式

每个主题尽量按照“总目录与学习路线 → 核心概念 → 最小实现 → 边界与常见错误 → 验证清单”的顺序整理。

不追求一次性写完，也不把目录填满作为目标。新的内容会随着实际学习和项目实践逐步补充。

## 关于本站

本站由 Markdown 驱动，源码和笔记都保存在 [GitHub 仓库](https://github.com/tsuiho6/fullstack-engineering-notes) 中。
