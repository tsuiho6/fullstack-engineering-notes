# unsafe：只在边界处使用的深水区

> 这一篇是 ○/△ 内容：理解边界，知道风险；除非有明确 profile 证据或系统边界需求，不把 unsafe 当作常规优化工具。

## 一、是什么

普通 Go 指针受类型系统和 GC 约束，不能做指针算术，也不能随意转换类型。`unsafe.Pointer` 提供受约束的底层地址转换能力；`uintptr` 只是整数，不具有指针保活语义。

## 二、为什么需要

unsafe 主要服务于 runtime、系统调用、内存布局、零拷贝和高性能边界。代价是绕过类型安全、GC 规则和可读性，代码可能依赖架构、对齐、生命周期和编译器实现。

## 三、核心用法

### 1. 普通指针与 unsafe.Pointer 的区别 △

```go
var x int
p := &x
up := unsafe.Pointer(p)
_ = (*int)(up)
```

`unsafe.Pointer` 可以在不同具体指针类型间转换，但转换必须满足类型布局和生命周期前提。不要把它当作可以任意加减的万能指针。

### 2. 使用官方 helper 做零拷贝转换 △

```go
func StringToBytes(s string) []byte {
	if len(s) == 0 {
		return nil
	}
	return unsafe.Slice(unsafe.StringData(s), len(s))
}

func BytesToString(b []byte) string {
	return unsafe.String(unsafe.SliceData(b), len(b))
}
```

前提和风险：

- `string → []byte` 得到的切片绝不能写；string 语义是不可变的；
- 结果不能超过原始数据生命周期；
- 零拷贝只在 profile 证明复制成本重要时考虑；默认转换让代码更安全。

## 四、核心原理

### 1. uintptr 不保活

```text
unsafe.Pointer：仍被 GC 视为指针，可参与对象可达性
uintptr：只是整数，GC 不会因为它保存了地址而保活对象
```

把 Pointer 转成 uintptr 后跨越函数调用、存到全局或异步使用，可能造成对象被回收或移动后地址失效。地址运算必须尽量在一个表达式中完成，并遵守 `unsafe` 文档规则。

### 2. 不要依赖私有布局

旧资料通过 `reflect.StringHeader`、`reflect.SliceHeader` 或 runtime 的 `hmap/slice` 结构读取长度、容量、字段偏移。现代 Go 更推荐内置 `len/cap`、`unsafe.SliceData`、`unsafe.StringData` 等公开 helper；runtime 私有布局可能改变。

## 五、常见场景

- △ syscall/cgo：与外部 ABI 交接时，按官方文档要求转换。
- △ 零拷贝：高吞吐解析、只读协议数据，且 benchmark 证明值得。
- ○ 读取私有字段、伪造 interface、硬编码 slice/map header：只用于实验和 runtime 研究。
- 不适合：为了少一次分配就把普通业务代码全部改 unsafe。

## 六、踩坑点

1. 违反指针生命周期，GC 可能回收对象。
2. 错误对齐或类型解释会产生未定义/架构相关行为。
3. 把 string 转 byte 后写入会破坏不可变假设。
4. 用 `uintptr` 保存地址跨 goroutine 使用是不安全的。
5. 依赖结构体字段顺序、runtime 私有结构和固定字节偏移会随版本/架构失效。
6. unsafe 代码很难被普通测试覆盖；应补充目标架构、race、benchmark 和边界测试。

## 七、项目中的实际使用

封装 unsafe 边界，不让它扩散到业务：

```go
// BytesView 返回只读视图；调用方不得修改返回值。
func BytesView(s string) []byte {
	if s == "" {
		return nil
	}
	return unsafe.Slice(unsafe.StringData(s), len(s))
}
```

更稳妥的默认写法仍是 `[]byte(s)`。只有在 profile、生命周期和只读约束都明确时才使用上面的封装，并在注释中写清所有权和不可写约定。

## 八、一句话总结

**unsafe 能绕过类型系统，但不能绕过内存生命周期、对齐、GC 和版本演进；把它限制在小而可审计的边界。**

## 九、核心问答

### Q1：uintptr 和 unsafe.Pointer 的本质区别？

Pointer 仍有指针语义、能参与 GC 可达性；uintptr 只是整数，保存地址不等于保活对象。

### Q2：为什么不推荐手写 StringHeader/SliceHeader 转换？

它依赖内部布局，容易违反生命周期与 GC 规则；现代 Go 提供了 `unsafe.StringData`、`unsafe.SliceData`、`unsafe.String`、`unsafe.Slice`。

### Q3：string 转 []byte 的零拷贝结果能写吗？

不能。它共享 string 的只读数据，写入会破坏语言假设。

## 十、自测与答案

### 题目

1. 为什么 `uintptr` 不能替代 `unsafe.Pointer` 保存对象？
2. 什么时候普通 `[]byte(s)` 比零拷贝更合适？
3. unsafe 访问 runtime 私有结构有哪些版本风险？

<details>
<summary>答案</summary>

1. GC 不会把 uintptr 当作根指针，对象可能被回收；并且地址算术可能超出有效生命周期。
2. 默认写法更安全、可读、可写；若复制成本不在真实热点，零拷贝只增加风险而无收益。
3. 字段、大小、对齐、实现算法会变，跨 Go 版本/架构都可能失效。

</details>

## 参考

- [原材料：unsafe](https://golang.design/go-questions/stdlib/unsafe/)
- [Package unsafe](https://go.dev/pkg/unsafe/)
