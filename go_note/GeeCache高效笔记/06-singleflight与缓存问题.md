# singleflight 与缓存问题：只让一个请求去加载同一个 key

> 优先级：⭐ 必须掌握

## 一、是什么

singleflight 是“重复函数调用抑制”机制：对同一组 key，在一次加载尚未结束时，只让第一个调用执行函数，其余调用等待并共享结果。

它解决的是同一进程内的并发回源，不是缓存容量、过期、节点故障或跨进程分布式锁。

## 二、为什么需要

单机并发缓存即使完全线程安全，也可能出现：

~~~text
goroutine A：查缓存 miss → 查数据库
goroutine B：查缓存 miss → 查数据库
goroutine C：查缓存 miss → 查数据库
~~~

同一个热点 key 在过期或首次加载时，会把一次回源放大成 N 次，形成缓存击穿/请求风暴。

### 三个相似概念先分清

| 概念 | 典型对象 | 现象 | 主要治理 |
|---|---|---|---|
| 缓存雪崩 | 大量 key 或整组缓存 | 同时失效，大量请求打向下游 | TTL 抖动、分批过期、降级、限流、容量与故障隔离 |
| 缓存击穿/惊群 | 一个存在且热门的 key | 过期瞬间大量并发回源 | singleflight、互斥加载、提前刷新、逻辑过期 |
| 缓存穿透 | 大量不存在的 key | 每次都 miss，持续打下游 | 负缓存、布隆过滤器、参数校验、限流 |

## 三、核心用法

### 1. 当前项目优先使用官方包

~~~go
import "golang.org/x/sync/singleflight"

type Group struct {
    // ...
    loader singleflight.Group
}
~~~

官方 Group 的核心接口是：

~~~go
v, err, shared := g.loader.Do(key, func() (any, error) {
    return loadFromPeerOrLocally()
})
~~~

输入：去重 key 和加载函数。输出：共享的值、共享的错误、是否有多个调用者拿到同一结果。

### 2. 接入 Group.load

~~~go
func (g *Group) load(ctx context.Context, key string) (ByteView, error) {
    v, err, _ := g.loader.Do(key, func() (any, error) {
        if g.peers != nil {
            if peer, ok := g.peers.PickPeer(key); ok {
                value, err := g.getFromPeer(ctx, peer, key)
                if err == nil {
                    return value, nil
                }
                g.logger.Printf("peer fetch failed: %v", err)
            }
        }
        return g.getLocally(ctx, key)
    })
    if err != nil {
        return ByteView{}, err
    }
    return v.(ByteView), nil
}
~~~

去重范围应覆盖“远程读取或本地回源”的整个加载过程，否则可能只合并了本地部分，仍然重复发起远程请求。

### 3. 自己理解机制时的最小模型

~~~go
type call struct {
    done chan struct{}
    val  any
    err  error
}

type Group struct {
    mu sync.Mutex
    m  map[string]*call
}
~~~

第一次请求把 call 放入 map 并执行；后续相同 key 找到 call，等待 done；第一个请求写入 val/err 后关闭 done 并删除 map。实际项目应使用官方包，避免遗漏 panic 清理、取消语义等边界。

## 四、核心原理

### 1. 锁和 singleflight 保护的是不同东西

~~~text
Mutex
  保护：map、链表、拓扑等共享结构的一致性

singleflight
  保护：同一 key 的“正在进行的加载”不被重复执行
~~~

直观含义：锁防止数据结构坏掉；singleflight 防止下游被重复打爆。

### 2. 为什么不能用全局锁包住回源

如果把数据库或 HTTP 调用放在一把全局 Mutex 内，不同 key 也会互相阻塞，吞吐量严重下降。singleflight 以 key 为粒度去重，不同 key 可以并行加载。

### 3. singleflight 的边界

- 只合并 in-flight 请求；加载完成后，下一次仍要查缓存。
- 去重 key 必须包含真正影响结果的维度，例如 group、租户、版本或语言。
- 只在同一个进程/实例中生效；多个进程需要路由到同一 owner，或使用外部协调机制。
- 第一个加载失败时，等待者通常共享同一个错误；应配合超时、退避和下游保护。

## 五、常见场景

- **必须有**：热点 key 首次加载、TTL 到期刷新、远程 peer 请求也可能重复时。
- **不够用**：跨实例全局去重、长时间后台刷新、强一致锁。需要分布式锁、任务队列或逻辑过期等额外方案。
- **防穿透**：对不存在 key 设计短 TTL 负缓存，但不要用 singleflight 把“不存在”永久缓存起来。

## 六、踩坑点

1. **把 singleflight 当缓存**：它不保存长期结果，只保存进行中的调用结果。
2. **去重 key 过短**：不同 group 的同名 key 可能错误合并。
3. **去重 key 过长或含高基数无治理**：会增加短期 map 压力和日志成本。
4. **在 singleflight 函数内再次调用同 key 的 Group.Get**：可能产生自等待或递归逻辑，应保持加载函数单向。
5. **忽略 context**：等待者或发起者取消后，项目要决定是否让底层加载继续；普通 Do 不会自动替你完成业务级取消策略。
6. **只合并本地 Getter，不合并远程访问**：仍然可能向 peer 发起 N 次相同请求。
7. **只靠 singleflight 防雪崩**：大量不同 key 同时失效时，singleflight 对每个 key 各执行一次，仍可能形成整体洪峰。
8. **加载函数 panic 后不清理**：自研实现容易让后续请求永久等待；项目优先使用官方实现。

## 七、项目中的实际使用

推荐分层治理：

~~~text
singleflight：同 key 同进程去重
一致性哈希：同 key 尽量路由到同一 owner
TTL 抖动/提前刷新：减少同时过期
负缓存/布隆过滤器：减少不存在 key 穿透
限流/熔断/降级：保护数据库和远端节点
~~~

指标建议记录：加载函数执行次数、shared 次数、加载耗时、错误数、等待队列长度或近似等待时间。不要只看缓存命中率，因为“命中率高但 singleflight 等待很长”也可能表示热点集中。

## 八、一句话总结

**锁保证结构安全，singleflight 保证同 key 的加载不重复；它能治击穿的一部分，不能包治所有缓存故障。**

## 九、核心问答

1. **缓存击穿和缓存穿透有什么区别？**  
   击穿是一个存在的热点 key 在失效瞬间被并发回源；穿透是大量不存在的 key 持续 miss。

2. **singleflight 为什么不能解决缓存雪崩？**  
   雪崩涉及大量不同 key 或整体缓存同时失效；singleflight 只能分别合并每个 key，不能消除整体洪峰。

3. **为什么不能用一把全局锁代替 singleflight？**  
   全局锁会让不同 key 的加载互相阻塞；singleflight 按 key 粒度去重，允许不同 key 并行。

4. **singleflight 是分布式锁吗？**  
   不是。它通常只在当前进程内生效，不能让多个进程共享“只有一个加载者”。

5. **singleflight 的 key 应该怎么选？**  
   必须包含所有影响结果的命名空间，例如 group、租户、版本；否则不同数据可能被错误合并。

## 十、自测与答案

### 题目

1. 100 个 goroutine 同时请求同一个未命中 key，singleflight 理想情况下让数据源执行几次？
2. 100 个 goroutine 请求 100 个不同 key，singleflight 会不会把它们合并成一次？
3. 如果 owner peer 失败，singleflight 的加载函数应该只做远程请求，还是包含本地回退？为什么？
4. TTL 抖动主要治理哪个问题？singleflight 主要治理哪个问题？

<details>
<summary>展开答案</summary>

1. 一次；其他调用等待并共享结果。
2. 不会；去重粒度是 key，不同 key 可以并行。
3. 应包含远程请求和本地回退，否则相同 key 的并发者可能分别重复执行远程失败和本地回源。
4. TTL 抖动主要减少大量 key 同时过期造成的雪崩；singleflight 主要减少同一 key 的并发回源，也就是击穿。

</details>
