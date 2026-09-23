# 08 并发、channel 与 context

## 一、是什么

goroutine 是并发执行单元；channel 用于在 goroutine 间传递数据和协调；context 负责把取消、截止时间和请求级元数据沿调用链传递。

## 二、为什么需要

并发能同时处理多个独立工作，但也带来共享状态竞争、任务泄漏和退出顺序问题。可靠代码必须把任务生命周期一并设计好。

## 三、核心用法

~~~go
func worker(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            return
        case job, ok := <-jobs:
            if !ok {
                return
            }
            result := process(job)
            select {
            case results <- result:
            case <-ctx.Done():
                return
            }
        }
    }
}
~~~

有限任务也可以用 sync.WaitGroup 等待结束；Go 1.25 起有 WaitGroup.Go 便捷方法，面向更早版本仍可使用 Add、go、Done 的传统写法。

## 四、核心原理

- 启动 goroutine 不等于它一定完成；必须有等待或结果收集机制。
- channel 的发送、接收和关闭都可能阻塞；关闭 channel 表示不会再有值发送，接收方可以通过 range 消耗已发送值。
- 通常由发送方关闭 channel；多个发送方时需要协调唯一关闭者。不要关闭接收方不拥有的 channel。
- context.Done 关闭表示任务应停止；取消信号不是强制杀死 goroutine，业务代码必须主动检查并返回。
- 共享内存可用 mutex 保护；channel 更适合传递所有权/工作项。选择简单且容易验证的方案。
- Go 1.22 的循环变量改为按迭代创建，但语义由模块 go 版本控制；旧 go.mod 仍应使用显式参数捕获等安全写法。

## 五、常见场景

并行 I/O、worker pool、请求级超时、服务关闭和后台任务适合并发模型。纯粹为了“看起来快”而给短小 CPU 工作启动大量 goroutine，未必更快。

## 六、踩坑点

- 每个 goroutine 都要有明确退出条件和错误/结果处理。
- 对 nil channel 收发会永久阻塞；关闭 channel 后继续发送会 panic。
- context 应作为函数首个参数传入，不要把请求级 context 存进长期存活的结构体。
- 创建 WithCancel/WithTimeout 后要调用 cancel，释放资源；即使操作先完成也应调用。
- 并发读写普通 map 或共享变量需要同步；用 go test -race ./... 排查竞态。

## 七、项目中的实际使用

为每个并发任务画清创建者、所有者、取消者、等待者和结果接收者。把 context 从请求入口传到底层操作；对服务关闭、超时、错误和部分结果分别定义策略。

## 八、一句话总结

**并发不是只启动 goroutine；要同时设计通信、同步、取消和收尾。**

## 九、核心问答

1. channel 关闭意味着什么？谁通常负责关闭？
2. context 取消能否强制结束 goroutine？
3. 共享内存与 channel 应如何选择？
4. Go 1.22 循环变量行为与 go.mod 有什么关系？

## 十、自测与答案

1. 如何保证启动的 goroutine 在函数返回前完成？
2. 为什么取消 context 后任务可能还在运行？
3. 一个任务启动了 WithTimeout，何时调用 cancel？

<details>
<summary>展开答案</summary>

1. 使用 WaitGroup、结果 channel 或其他明确的同步/等待机制。
2. 取消只是关闭通知通道；任务必须主动监听并退出。
3. 无论成功、失败还是超时，都应尽早调用，通常用 defer cancel()。

</details>

**上一篇：**[反射：Type、Value 与边界](./07-反射-Type-Value与边界.md) · **下一篇：**[测试与验证](./09-测试与验证.md)

**版本参考：**[Go 1.22 循环变量说明](https://go.dev/doc/go1.22) · [Go 1.25 WaitGroup.Go](https://go.dev/doc/go1.25)
