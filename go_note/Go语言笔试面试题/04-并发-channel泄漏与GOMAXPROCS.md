# 并发：channel、goroutine 泄漏与 GOMAXPROCS

> 本章把“会启动 goroutine”提升为“能管理并发任务生命周期”。channel 只是通信工具，真正的项目能力是让任务可等待、可取消、可收尾。

## 一、是什么

- goroutine：由 Go runtime 调度的轻量并发执行单元。
- channel：在 goroutine 之间传递值，并通过发送/接收建立同步。
- WaitGroup：等待一组 goroutine 完成。
- context.Context：传播取消信号、截止时间和请求范围。
- GOMAXPROCS：限制同时执行用户态 Go 代码的处理器数量，不是 goroutine 总数，也不是所有操作系统线程总数。

## 二、为什么需要

并发程序最难的不是“同时做几件事”，而是：

1. 如何把任务和结果传出去；
2. 如何知道所有任务已经结束；
3. 某个任务失败后如何停止其他任务；
4. 网络、channel 或循环阻塞时如何退出；
5. 如何避免竞态、死锁和 goroutine 泄漏。

## 三、核心用法

### 1. 无缓冲与有缓冲 channel

无缓冲 channel 是 rendezvous：发送方和接收方必须在时间上相遇。

~~~go
ch := make(chan int)

go func() {
	ch <- 1 // 等待接收方
}()

value := <-ch // 接到值后发送方才能继续
_ = value
~~~

有缓冲 channel 先把值放入容量为 cap 的队列：

~~~go
ch := make(chan int, 2)
ch <- 1 // 不阻塞
ch <- 2 // 不阻塞
// ch <- 3 // 缓冲已满，阻塞，直到有人接收
~~~

接收方在 channel 为空时阻塞；发送方在无缓冲接收者或缓冲区已满时阻塞。

缓冲区不是“自动并发优化”。容量应表达明确的解耦需求或背压策略，而不是随便填一个大数字。

### 2. channel 的关闭和 range

通常由发送方负责关闭：

~~~go
results := make(chan Result)

go func() {
	defer close(results)
	for _, job := range jobs {
		results <- run(job)
	}
}()

for result := range results {
	consume(result)
}
~~~

关闭表示“不会再有新值”，不代表已经把缓冲区里的值丢掉。接收方可以继续读完剩余值，range 会在 channel 关闭且读空后结束。

需要区分：

~~~go
value, ok := <-ch
~~~

ok 为 false 表示 channel 已关闭且没有更多值；它不表示收到一个业务上的零值。

### 3. WaitGroup 只负责等待

~~~go
var wg sync.WaitGroup

for _, url := range urls {
	wg.Add(1)
	go func(url string) {
		defer wg.Done()
		download(url)
	}(url)
}

wg.Wait()
~~~

Add 应在启动 goroutine 前完成，Done 用 defer 保证退出路径都会执行。WaitGroup 不负责传递错误，也不负责取消其他 goroutine。

### 4. context 负责取消和截止时间

~~~go
func worker(ctx context.Context, jobs <-chan Job) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case job, ok := <-jobs:
			if !ok {
				return nil
			}
			if err := run(job); err != nil {
				return err
			}
		}
	}
}
~~~

调用方创建派生 context 后要释放 cancel：

~~~go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()
~~~

context 的职责是通知“请停止”，被调用函数仍必须在阻塞点监听 ctx.Done() 并真正退出。

### 5. channel 方向限制意图

~~~go
func produce(out chan<- Job) {}
func consume(in <-chan Job) {}
~~~

chan<- 只能发送，<-chan 只能接收。它们在函数签名中把错误用法提前变成编译错误。

## 四、核心原理

### 1. channel 的本质是通信 + 阻塞规则

可以用下面的表快速判断：

| 状态 | 发送 | 接收 |
|---|---|---|
| nil channel | 永久阻塞 | 永久阻塞 |
| 未关闭且有值 | 按容量/接收者规则继续或阻塞 | 读到值 |
| 已关闭且已读空 | panic | 得到零值和 ok=false |
| 已关闭但仍有缓冲值 | 继续发送会 panic | 先读完缓冲值 |

关闭不是广播所有任务立刻停止；要让阻塞任务退出，通常需要 context 或额外的 done channel。

### 2. goroutine 泄漏是“生命周期没有闭合”

泄漏不是“goroutine 数量多”这么简单，而是 goroutine 创建后失去可达的退出路径，持续占用栈、引用和调度资源。常见原因：

- 发送没有接收者；
- 接收没有发送者；
- 等待条件永远不会满足；
- 无限重试或无限循环没有超时/取消；
- 任务失败后仍有 goroutine 阻塞在结果发送；
- channel、WaitGroup 的关闭或 Done 责任不清。

判断泄漏的核心问题：**每个 goroutine 在正常、错误、取消三种路径上如何返回？**

### 3. GOMAXPROCS 不等于线程池大小

runtime.GOMAXPROCS(n) 控制的是同时执行用户态 Go 代码的最大处理器数。被系统调用阻塞的线程不计入这个限制，因此它不是“最多只能创建 n 个 OS 线程”。

当前 Go runtime 会根据逻辑 CPU 数、CPU 亲和性和容器 CPU 配额等因素选择默认值，并可能自动更新。除非有明确的压测、隔离或部署约束，不要凭“CPU 密集设 1、IO 密集设 2 倍”这种旧经验手工改它。

## 五、常见场景

- ⭐ HTTP 请求、任务队列、批量 IO：worker + 有界 channel + context。
- ⭐ 多个任务只需等待：WaitGroup。
- ⭐ 需要逐个消费结果：channel + 发送方 close。
- ⭐ 请求结束或超时要停止下游：传递 request.Context。
- △ CPU 密集型并行：先基准测试，再评估 GOMAXPROCS 和任务粒度。
- ○ runtime.NumGoroutine、pprof 等诊断工具：用于定位问题，不是业务同步手段。

## 六、踩坑点

1. 用 time.Sleep 判断并发任务完成；应使用 WaitGroup、channel 或 context。
2. 忘记 wg.Done，导致 Wait 永久阻塞。
3. 多个发送者互相不知道谁负责 close，造成重复关闭或发送到已关闭 channel。
4. 发送方已经退出，接收方仍 range 一个永不关闭的 channel。
5. 没有监听 ctx.Done，客户端取消后 worker 继续阻塞。
6. 把有缓冲 channel 当成无限队列；缓冲满后发送仍会阻塞。
7. 认为 channel 自动消除数据竞争；channel 之外访问的共享 map/变量仍需同步。
8. 把 deadlock、goroutine leak、data race 混为一谈：它们的症状和诊断手段不同。
9. 随意设置 GOMAXPROCS 并以为可以限制 goroutine 或 OS 线程总量。

## 七、项目中的实际使用

一个可收尾的批处理流程应有这些角色：

~~~text
请求 / 调度器
    -> 创建 ctx 和取消函数
    -> 启动有限数量 worker
    -> 投递任务，监听取消
    -> worker 处理任务，发送结果或第一个错误
    -> 错误发生时 cancel 其他任务
    -> 等待所有 worker 退出
    -> 由唯一协调者关闭结果 channel
~~~

启动 goroutine 前写下六个答案：

1. 谁启动？
2. 谁等待？
3. 谁发送？
4. 谁关闭？
5. 谁取消？
6. 每个阻塞点如何退出？

并发改动至少执行：

~~~powershell
go test ./...
go test -race ./...
~~~

race 检测器只能发现实际运行路径暴露出的数据竞争，不能证明所有路径绝对无竞态；但它应成为并发代码的常规验证。

## 八、一句话总结

**channel 负责通信，WaitGroup 负责等待，context 负责取消；goroutine 的完成标准是所有退出路径都闭合。**

## 九、核心问答

### 1. 无缓冲和有缓冲 channel 的核心区别是什么？

无缓冲要求发送和接收同步相遇；有缓冲允许发送方在容量未满时暂时脱离接收方。两者都可能阻塞，区别是阻塞条件不同。

### 2. 谁应该关闭 channel？

通常由知道“不会再发送”的发送方或协调者关闭；接收方通常不关闭。多个发送者时，设置唯一协调者，避免重复关闭。

### 3. WaitGroup 能不能替代 context？

不能。WaitGroup 只等待计数归零，不传播取消、不传递错误、不让阻塞 IO 自动结束。

### 4. 什么是 goroutine 泄漏？

创建出的 goroutine 长时间无法退出，并且其数量或占用持续累积。常见根因是永久阻塞、无限重试、缺少取消或 channel 责任不清。

### 5. GOMAXPROCS 限制的是什么？

同时执行用户态 Go 代码的处理器数量；不限制 goroutine 总数，也不限制因系统调用阻塞的 OS 线程数量。

## 十、自测与答案

### 先独立作答

1. 无缓冲 channel 的发送方何时能继续？
2. 为什么发送方通常负责关闭 channel？
3. 一个 worker 同时需要响应“新任务”和“请求取消”，应该用什么结构？
4. 为什么只加 WaitGroup 仍可能发生 goroutine 泄漏？
5. GOMAXPROCS(1) 是否等于程序只能有一个 goroutine？

<details>
<summary>答案</summary>

1. 接收方从 channel 接收时，发送方才能完成发送并继续。
2. 发送方最清楚何时不会再产生值；接收方无法判断其他发送方是否仍在工作。
3. 用 select 同时监听 jobs channel 和 ctx.Done()，并在两条路径上返回。
4. WaitGroup 只记录“是否结束”，不提供结束信号；任务仍可能永久阻塞在发送、接收、IO 或循环中。
5. 不是。它限制并行执行用户态 Go 代码的处理器数，仍可创建多个 goroutine，阻塞系统调用也不计入该限制。

</details>
