# 07 反射：Type、Value 与边界

## 一、是什么

反射通过 reflect 在运行时检查和操作类型和值。它适合类型在编译期未知、但运行时必须通用处理的边界场景。

## 二、为什么需要

序列化、ORM、依赖注入、测试框架等库需要在运行时处理任意结构体；若没有反射，只能为每种类型手写重复代码。

## 三、核心用法

~~~go
t := reflect.TypeOf(value)   // 动态类型；nil interface 会得到 nil
v := reflect.ValueOf(value)  // 动态值；nil 输入会得到 invalid Value

func setStringField(ptr any, name, text string) error {
    v := reflect.ValueOf(ptr)
    if v.Kind() != reflect.Pointer || v.IsNil() {
        return errors.New("want a non-nil pointer")
    }
    v = v.Elem()
    if v.Kind() != reflect.Struct {
        return errors.New("want a pointer to struct")
    }
    field := v.FieldByName(name)
    if !field.IsValid() || field.Kind() != reflect.String || !field.CanSet() {
        return errors.New("field is missing or not settable")
    }
    field.SetString(text)
    return nil
}
~~~

## 四、核心原理

- Type 描述运行时类型信息，Value 是可检查或操作的运行时值。
- Value 是否可设置取决于它是否来自可寻址、可修改的值；常见做法是传入非 nil 指针，再调用 Elem。
- 导出字段通常可被反射接口化和设置；非导出字段受到限制。
- 反射操作会把一些编译期错误变成运行时分支或 panic，因此必须验证 Kind、IsValid、CanSet 等前置条件。

## 五、常见场景

适合通用序列化/反序列化、ORM 映射、结构化配置和调试工具。不适合普通业务逻辑、频繁调用的热路径或本可由接口/泛型表达的代码。

## 六、踩坑点

- reflect.TypeOf(nil) 返回 nil；reflect.ValueOf(nil) 返回 invalid Value。不能对 invalid Value 调用 Kind 以外的大多数操作。
- IsNil 只适用于 chan、func、map、pointer、unsafe pointer、interface、slice 等可 nil 的 Kind；其他类型调用会 panic。
- 可读取不代表可设置；写入前检查 CanSet。
- 不能用反射绕过 Go 的可见性规则去安全修改非导出字段。
- 反射没有自动解决并发安全、输入校验或领域语义。

## 七、项目中的实际使用

优先级通常是：具体类型 → 小接口 → 泛型 → 反射。只有在库确实要接受未知结构体形状时，才引入反射；把反射限制在少数边界函数，并为无效类型、nil、不可设置字段编写测试。

## 八、一句话总结

**反射把类型信息带到运行时；能力越动态，越要把检查和边界限制做清楚。**

## 九、核心问答

1. reflect.Type 与 reflect.Value 分别描述什么？
2. 为什么设置结构体字段通常要传指针？
3. 类型断言、泛型、反射分别更适合解决什么问题？

## 十、自测与答案

1. ValueOf(nil) 是否能直接调用 Elem？
2. CanSet 为 false 时调用 SetString 会怎样？
3. 为什么一般业务代码不应优先使用反射？

<details>
<summary>展开答案</summary>

1. 不行；它是 invalid Value，相关操作会 panic。
2. 会 panic；应先验证 Value 有效、Kind 正确且 CanSet 为 true。
3. 反射把编译期约束转为运行时错误，降低可读性和静态检查能力，且更难测试与维护。

</details>

**上一篇：**[泛型与类型约束](./06-泛型与类型约束.md) · **下一篇：**[并发、channel 与 context](./08-并发、channel与context.md)

**延伸阅读：**[Go 官方 reflect 文档](https://pkg.go.dev/reflect)
