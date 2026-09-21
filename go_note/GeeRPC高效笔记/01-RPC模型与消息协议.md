# RPC 模型与消息协议：先把一次调用说清楚

> 优先级：⭐ 必须掌握

## 一、是什么

RPC（Remote Procedure Call）是一种让一个进程通过网络请求另一个进程执行方法的通信抽象。它把远程调用包装成类似本地函数调用的形式，但网络、序列化、错误和超时并不会因此消失。

## 二、为什么需要

裸写 TCP 只能收发字节，不能回答这些问题：

- 一条消息从哪里开始、到哪里结束？
- 调用的是哪个服务、哪个方法？
- 请求参数和响应结果如何编码？
- 并发请求返回乱序时，结果属于谁？
- 客户端和服务端如何确认双方使用同一个协议？

RPC 协议要做的第一件事，就是把这些隐含约定变成可解析的消息形状。

## 三、核心用法

### 1. GeeRPC 教学帧

原文采用一条连接只发送一次 `Option`，之后重复发送请求头和请求体：

```text
连接建立
  └─ Option(JSON)
       ├─ Header{ServiceMethod, Seq, Error}
       ├─ Body(args)
       ├─ Header{ServiceMethod, Seq, Error}
       └─ Body(args)
```

最小接口可以写成：

```go
type Codec interface {
	ReadHeader(*Header) error
	ReadBody(any) error
	Write(*Header, any) error
	Close() error
}

type Header struct {
	ServiceMethod string // "Foo.Sum"
	Seq           uint64 // 请求与响应的关联键
	Error         string // 非空表示远程处理失败
}
```

输入：方法名、唯一序号、参数值。输出：同一个 `Seq` 对应的结果或错误。

### 2. 协议交换的最小校验

```go
type Option struct {
	MagicNumber    uint32
	CodecType      string
	ConnectTimeout time.Duration
}

func validateOption(opt Option) error {
	if opt.MagicNumber != magicNumber {
		return fmt.Errorf("rpc: invalid magic number")
	}
	if !supportedCodec(opt.CodecType) {
		return fmt.Errorf("rpc: unsupported codec %q", opt.CodecType)
	}
	return nil
}
```

`MagicNumber` 用于尽早拒绝误连的端口；`CodecType` 用于选择后续 Header/Body 的编解码器。

### 3. 项目推荐的 framing 思路

教学阶段可以依赖 Gob 的流式编码；项目协议应明确消息边界，例如：

```text
固定前缀：version | codec | headerLen | bodyLen | requestID
Header：结构化元数据
Body：序列化后的 args 或 reply
```

长度字段的直观含义：接收端不必猜测 body 结束位置，可以按长度精确读取，并在超限时拒绝异常消息。

## 四、核心原理

### 1. 为什么 `net.Conn` 不等于消息队列

TCP 提供的是有序、可靠的字节流，而不是“每次 Write 对应一次 Read”。一次写入可能被拆成多次读取，多次写入也可能合并成一次读取。

因此，RPC 必须自行提供 framing：

```text
字节流 = [长度/边界信息][消息内容][长度/边界信息][消息内容]...
```

直观含义：没有 framing，接收端无法判断下一次解码该读多少字节。

### 2. 为什么响应需要 `Seq`

假设请求 A、B 共用一条连接，服务端先完成 B：

```text
发送：A(seq=1), B(seq=2)
返回：B(seq=2), A(seq=1)
```

只按返回顺序交付会把 B 的结果写进 A 的 reply。`Seq` 让客户端可以建立：

```text
pending[seq] -> *Call
```

公式：

```text
响应归属 = pending[响应.Seq]
```

直观含义：响应顺序可以变化，但身份不能丢。

### 3. 为什么写入通常要串行

多个 goroutine 同时向同一连接写 Header 和 Body，可能形成：

```text
HeaderA + HeaderB + BodyA + BodyB
```

这会破坏帧结构。处理请求可以并发，但同一连接的完整报文写入必须由一把发送锁保护；锁的范围要覆盖 Header 与 Body，而不是只锁 Header。

## 五、常见场景

- **适合 RPC**：内部服务、调用双方受控、接口稳定、需要强类型和高效二进制传输。
- **适合 REST/JSON**：公开 API、浏览器直接访问、跨组织集成、调试和可读性优先。
- **适合 gRPC/Protobuf**：多语言、接口由 schema 管理、需要生成客户端/服务端代码。
- **不适合自研协议**：只需要几个内部接口、团队没有协议演进和运维能力时，优先成熟框架。

## 六、踩坑点

1. **把 TCP 的一次 Write 当成一次消息**：必须有 framing 或使用能提供消息边界的协议。
2. **Option 只解一次但每个请求都重复发**：双方协议状态不一致，后续解码会错位。
3. **Header 和 Body 使用了不同 Codec**：一个能读 Header，另一个不能读 Body，连接会进入不可恢复状态。
4. **`Seq` 重复或回绕未处理**：pending 会覆盖旧调用；项目需定义唯一性和生命周期。
5. **错误响应仍解码成正常 reply**：先检查 `Header.Error`，再决定是否读取/丢弃 body。
6. **无限制长度字段**：恶意或损坏报文可能申请巨大内存；生产协议必须有最大帧大小。
7. **以为 Gob 适合跨语言**：Gob 是 Go 生态内的教学选择，跨语言应使用明确的 schema。

## 七、项目中的实际使用

建议将协议层与业务层隔离：

```text
transport 负责连接、读写、TLS/HTTP 入口
codec      负责 Header/Body 编解码和 framing
rpc core   负责 Seq、pending、服务查找、调用分发
business   只关心请求类型、业务错误和 reply
```

当前 Go 写法中：

- 用 `any` 替代旧代码中的 `interface{}`，但不要误以为它提供了类型安全。
- 用 `context.Context` 传递 deadline、取消信号和请求范围信息。
- 对公共协议固定版本、最大消息大小和错误码；不要只依赖自由文本错误。
- 生产场景优先考虑 gRPC/Protobuf 或成熟 RPC 框架；GeeRPC 适合学习协议和框架内部。

## 八、一句话总结

**TCP 只给字节流，RPC 协议必须补上消息边界、方法名、请求 ID、编码方式和错误形状。**

## 九、核心问答

1. **为什么 RPC 请求不能只发送方法名和 Body？**  
   因为并发和乱序响应需要 `Seq` 关联调用，协议协商还需要版本/Codec 等元数据。

2. **为什么“请求并发、响应写串行”不矛盾？**  
   业务处理互不依赖可以并发；同一连接上的字节写入必须保持每帧完整，避免交织。

3. **Gob 和 framing 是一回事吗？**  
   不是。Gob 是编码方式；framing 是定义消息边界的协议机制。某种编码可能内部带边界，但接口设计仍需明确这一点。

4. **`Seq` 是服务方法名的一部分吗？**  
   不是。方法名描述“调用什么”，`Seq` 描述“这一次调用是哪一个”。

5. **为什么公共接口常选 Protobuf 而不是直接 Gob？**  
   Protobuf 有明确 schema、跨语言支持和兼容演进约定；Gob 更适合 Go 内部或教学演示。

## 十、自测与答案

### 题目

1. TCP 已经保证有序可靠，为什么还需要 RPC 的 `Seq`？
2. 如果 A、B 两个请求并发发送，服务端先完成 B，客户端靠什么把结果交给正确的调用方？
3. 同一连接的两个 goroutine 各自调用 `Write(header)` 和 `Write(body)`，可能产生什么问题？
4. 一个响应 Header 已经包含错误，客户端还应该把 body 解码到正常 reply 吗？

<details>
<summary>展开答案</summary>

1. TCP 只保证字节顺序，不知道哪些字节属于哪个逻辑调用；`Seq` 是应用层的调用身份。
2. 用响应中的 `Seq` 查 `pending[Seq]`，取回对应的 `Call`。
3. Header 和 Body 可能交错，导致接收端无法按协议解析；必须锁住完整写入过程。
4. 不应当按成功结果处理；应先记录远程错误，再按协议约定消费或丢弃错误 body，保持流状态一致。

</details>
