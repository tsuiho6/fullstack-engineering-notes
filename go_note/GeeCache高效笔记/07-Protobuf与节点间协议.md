# Protobuf 与节点间协议：把远程字节流变成可演进的结构化报文

> 优先级：△ 理解即可；如果项目用 HTTP + Protobuf，则升级为 ⭐

## 一、是什么

Protobuf（Protocol Buffers）是“先定义消息结构，再生成代码”的二进制序列化格式。发送方把结构化消息编码成 wire bytes，接收方按同一份 schema 解码。

在 GeeCache 中，它可以替换“URL 参数 + 裸字节响应”这种教学协议，让请求和响应拥有明确的字段形状与演进规则。

## 二、为什么需要

裸字节可以传值，但无法表达稳定的消息契约；JSON 易读但体积和解析成本通常更高。节点协议一旦要增加字段、跨语言或控制传输体积，就需要结构化编码。

Protobuf 解决：

- 字段名和类型有 schema；
- 二进制传输通常更紧凑；
- 可通过字段编号向前兼容地增加字段；
- 可生成 Go、Java、C++ 等语言的访问代码。

它不自动解决鉴权、重试、超时、版本兼容和 RPC 服务治理。

## 三、核心用法

### 1. 当前建议的 proto 定义

~~~protobuf
syntax = "proto3";

package geecache.v1;
option go_package = "example.com/geecache/internal/geecachepb;geecachepb";

message GetRequest {
  string group = 1;
  string key = 2;
}

message GetResponse {
  bytes value = 1;
}
~~~

数据形状：

~~~text
GetRequest  = { group: string, key: string }
GetResponse = { value: bytes }
~~~

为什么 value 用 bytes：缓存值可能是字符串、JSON、图片、压缩数据或其他序列化结果，不应被协议层强行解释成字符串。

### 2. 生成 Go 代码

~~~powershell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
protoc -I=. --go_out=. --go_opt=paths=source_relative geecache.proto
~~~

项目中应把工具版本固定在开发文档或构建环境中，不要让生产构建随意漂移到未验证的 latest。proto 文件应声明 go_package，避免生成代码的 import path 不明确。

### 3. 使用现代 Go Protobuf API

~~~go
import "google.golang.org/protobuf/proto"

func encode(value []byte) ([]byte, error) {
    return proto.Marshal(&pb.GetResponse{Value: bytes.Clone(value)})
}

func decode(data []byte) ([]byte, error) {
    var msg pb.GetResponse
    if err := proto.Unmarshal(data, &msg); err != nil {
        return nil, err
    }
    return bytes.Clone(msg.Value), nil
}
~~~

输入：生成的消息指针或 wire bytes。输出：wire bytes 或填充后的消息结构。返回值仍建议复制，保持缓存值的所有权边界。

### 4. 通过 HTTP 承载 Protobuf

服务端：

~~~go
body, err := proto.Marshal(&pb.GetResponse{Value: view.ByteSlice()})
if err != nil {
    http.Error(w, "encode response", http.StatusInternalServerError)
    return
}
w.Header().Set("Content-Type", "application/x-protobuf")
w.WriteHeader(http.StatusOK)
_, _ = w.Write(body)
~~~

客户端：

~~~go
resp, err := client.Do(req)
if err != nil {
    return err
}
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
    return fmt.Errorf("peer returned %s", resp.Status)
}
body, err := io.ReadAll(io.LimitReader(resp.Body, maxPeerBodyBytes))
if err != nil {
    return err
}
var out pb.GetResponse
if err := proto.Unmarshal(body, &out); err != nil {
    return fmt.Errorf("decode peer response: %w", err)
}
~~~

### 5. Protobuf 与 gRPC 的区别

| 项目 | Protobuf | gRPC |
|---|---|---|
| 解决什么 | 消息定义与序列化 | 基于 HTTP/2 的 RPC 框架与调用模型 |
| 是否必须一起用 | 不必须 | 通常使用 Protobuf 定义接口 |
| 本教程需要 | 用 Protobuf 编码 HTTP body | 不需要 gRPC stub |
| 生成内容 | message 类型 | message + client/server 接口和 stub |

原文里的 service 声明如果没有启动 gRPC 服务，实际不会被 HTTP 代码调用。只用 HTTP 承载消息时，定义 message 即可；只有真正使用 gRPC 时，才额外安装 grpc 生成插件并生成服务代码。

## 四、核心原理

### 1. 字段编号比字段名更重要

wire format 主要依赖字段编号和类型。兼容规则的主干是：

- 已发布字段编号不要复用；
- 新字段追加新编号；
- 删除字段后保留编号，必要时在 proto 中标记 reserved；
- 修改字段类型要谨慎，很多类型变化会破坏解码语义；
- 老客户端通常忽略未知字段，新客户端可以兼容缺失字段的默认值。

### 2. 二进制不等于“自动更快”

性能还受消息大小、分配次数、压缩、网络连接复用、CPU 和调用频率影响。Protobuf 的价值是结构化、跨语言和通常较小的 wire format；是否更快要用基准测试和线上指标验证。

### 3. 协议升级要和节点滚动发布配合

推荐新增字段时保持旧字段语义不变；先发布能识别新字段但仍兼容旧请求的版本，再逐步让发送方使用新字段。不要把“生成代码能编译”当成“集群兼容”。

## 五、常见场景

- **适合**：内部高频 RPC、跨语言通信、消息结构稳定但需要演进的节点协议。
- **不一定适合**：公网调试 API、人工阅读优先的接口；JSON 通常更直观。
- **不负责**：服务发现、重试策略、鉴权、限流、链路追踪和幂等语义。

## 六、踩坑点

1. **继续使用旧的 github.com/golang/protobuf/proto**：新项目优先使用 google.golang.org/protobuf。
2. **不写 go_package**：生成代码的包路径和模块引用容易混乱。
3. **复用已经发布的字段编号**：旧数据可能被错误解码。
4. **把 bytes 当 string**：可能损坏二进制缓存内容。
5. **解码前不检查 HTTP 状态码**：错误文本会触发 protobuf 解码失败，真正原因被遮住。
6. **不限制响应 body**：Protobuf 解码不是安全边界，仍需限制输入大小。
7. **修改 proto 但不重新生成代码**：源码和生成代码不一致，CI 或运行时才暴露问题。
8. **把 service 声明误认为已经拥有 gRPC 服务**：声明只是 schema；还需要生成插件、server 实现和注册。
9. **协议里没有版本/能力演进策略**：滚动发布时新旧节点可能互相不理解。

## 七、项目中的实际使用

建议把协议层独立成 internal package，并规定：

1. 只让内部 peer 访问，使用 mTLS、网络策略或签名鉴权。
2. 每次请求设置 context timeout，限制请求/响应尺寸。
3. 用 group/key 的字段替代 URL 拼接，减少编码边界问题。
4. 为消息保留版本演进空间；新增字段不改变旧字段含义。
5. 在测试中做 marshal/unmarshal 往返、未知字段兼容、空值和大值边界测试。
6. 记录协议版本、peer、状态和解码错误，但避免把原始敏感 key 写进日志。

## 八、一句话总结

**Protobuf 负责定义和编码消息，HTTP/gRPC 负责传输与调用，字段编号和版本规则负责让协议能长期演进。**

## 九、核心问答

1. **为什么缓存 value 使用 bytes 而不是 string？**  
   因为缓存值可能是任意二进制，bytes 保留原始内容，不限制上层编码。

2. **Protobuf 和 gRPC 是一回事吗？**  
   不是。Protobuf 是消息 schema/序列化格式，gRPC 是 RPC 框架；可以用 HTTP 自己承载 Protobuf。

3. **为什么不能复用删除字段的编号？**  
   老消息或老节点可能仍按旧语义发送该编号，复用会让新代码误解旧数据。

4. **为什么现代项目优先 google.golang.org/protobuf？**  
   它是当前 Go Protobuf API；旧模块主要保留兼容性，新代码应跟随官方现代 API。

5. **Protobuf 是否自动让整个系统更可靠？**  
   不会。它只约束消息编码；超时、鉴权、重试、熔断和错误处理仍需系统设计。

## 十、自测与答案

### 题目

1. GetRequest 和 GetResponse 的字段形状分别是什么？
2. 只用 HTTP 承载 Protobuf 时，为什么不需要生成 gRPC server/client？
3. 新版本要增加过期时间字段，应该复用旧编号还是追加新编号？
4. 客户端收到 HTTP 500 后还应不应该尝试 Unmarshal body？

<details>
<summary>展开答案</summary>

1. Request 是 group string + key string；Response 是 value bytes。
2. 因为 HTTP 仍是传输层，代码只需要 proto.Marshal/Unmarshal，不需要 gRPC 的调用模型和 stub。
3. 追加新编号，保持旧字段和旧编号语义不变。
4. 通常不应；先按 HTTP 协议处理错误。除非错误响应本身也定义了独立的错误消息格式。

</details>
