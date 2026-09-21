# 程序生命周期：init、defer 与输出题

> 本章不是让你背输出，而是训练“执行时序”能力：包什么时候初始化，defer 的参数什么时候求值，返回值什么时候确定，闭包什么时候读取变量。

## 一、是什么

- init：包初始化阶段自动执行的函数，发生在 main 之前。
- defer：登记一个函数调用，在当前函数即将返回前执行。
- 输出题：用最小代码考查作用域、常量求值、参数求值和调用栈时序。

## 二、为什么需要

初始化和清理经常跨越多个函数、文件和控制流。如果不理解时序，就会误判：

- 包变量是否已经初始化；
- defer 是退出 if 执行还是退出整个函数执行；
- defer 捕获的是旧值还是最终值；
- defer 能不能修改返回值；
- 多个 defer 谁先执行。

## 三、核心用法

### 1. init 的最小模型

~~~go
var port = 8080

func init() {
	if port == 0 {
		panic("invalid port")
	}
}

func main() {
	start(port)
}
~~~

初始化的大方向：

~~~text
依赖包先初始化
    -> 当前包的包级常量和变量
        -> 当前包的 init
            -> main 包初始化完成
                -> main()
~~~

一个包可以有多个 init，但项目不应依赖多个 init 之间的细粒度顺序。需要明确顺序的初始化，优先写成显式的 New、Open 或 Setup 函数。

### 2. defer 的标准用法

资源成功获取后立即登记清理：

~~~go
f, err := os.Open(name)
if err != nil {
	return err
}
defer f.Close()
~~~

锁、取消函数也常这样写：

~~~go
mu.Lock()
defer mu.Unlock()

ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()
~~~

多个 defer 按后进先出执行：

~~~go
defer fmt.Println("first")
defer fmt.Println("second")
// 函数返回时输出 second，再输出 first
~~~

### 3. 参数在登记时求值，闭包在执行时读取

~~~go
func f(n int) {
	defer fmt.Println(n)
	n += 100
}
// f(1) 输出 1
~~~

fmt.Println 的参数在 defer 登记时就保存了。

~~~go
func g() {
	n := 1
	defer func() {
		fmt.Println(n)
	}()
	n += 100
}
// g() 输出 101
~~~

闭包没有复制 n 的当前值，而是在函数返回前读取外层变量。

### 4. defer 与返回值

~~~go
func plain() int {
	n := 0
	defer func() { n++ }()
	return n
}

func named() (n int) {
	defer func() { n++ }()
	return n
}
~~~

plain 返回 0；named 返回 1。原因是：

- return 表达式先计算；
- 返回值槽位被确定；
- defer 执行；
- 函数最终返回。

对普通返回值，defer 修改局部变量不等于修改已经确定的返回结果；对有名返回值，defer 可以直接修改返回值槽。

### 5. defer 的作用域是函数

~~~go
func printValue() {
	n := 1
	if n == 1 {
		defer fmt.Println(n)
		n += 100
	}
	fmt.Println(n)
}
// 输出 101，再输出 1
~~~

离开 if 块不会执行 defer；只有 printValue 即将返回时才执行。

## 四、核心原理

### 1. init 解决“包可用之前的准备”

包初始化遵循依赖关系，而不是简单地按照 import 文本从上到下执行。包级变量先完成初始化，随后运行 init，main 在所有依赖准备好之后才开始。

直观理解：**main 不是程序的第一个动作，导入依赖的初始化才是。**

### 2. defer 是调用记录，不是代码块 finally

执行到 defer 时，Go 保存待调用函数及其已经求值的参数；函数返回前按栈顺序执行这些记录。它绑定的是函数生命周期，不是最近的大括号。

### 3. 链式 defer 的陷阱

~~~go
type T struct{}

func (T) step(n int) T {
	fmt.Print(n)
	return T{}
}

func demo() {
	var t T
	defer t.step(1).step(2)
	fmt.Print(3)
}
~~~

输出是 132。defer 登记的是最后一个 step(2) 调用；为了得到它的 receiver，t.step(1) 会在登记阶段执行，然后立即打印 1，函数体打印 3，返回前再打印 2。

项目代码中不要用复杂链式表达式承载清理逻辑，拆成多个清晰的 defer 更容易审查。

## 五、常见场景

- ⭐ 文件、锁、连接、事务、context cancel 的清理。
- △ 包级注册、驱动初始化、默认配置校验。
- △ 面试中的作用域、闭包和返回值题。
- ○ 极少数框架依赖 init 自动注册；使用前先确认初始化顺序和副作用。

## 六、踩坑点

1. 把 defer 当成 if/for 块退出时执行。
2. 忽略 defer 参数的即时求值。
3. 以为 defer 一定不能影响返回值；有名返回值可以被修改。
4. 在超长循环中 defer 大量资源释放，使资源延迟到外层函数返回。
5. 在 init 中执行网络请求、读写文件或启动 goroutine，导致导入包就产生不可见副作用。
6. 依赖多个文件或多个 init 的顺序。
7. 在 defer 中丢弃 Close、Commit 等关键错误，却没有评估是否需要合并返回错误。

## 七、项目中的实际使用

推荐把 init 控制在“无副作用、不可失败或失败即不能启动”的范围内。需要可测试、可配置、可返回错误的初始化，写成显式函数：

~~~go
func NewServer(cfg Config) (*Server, error) {
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validate config: %w", err)
	}
	return &Server{cfg: cfg}, nil
}
~~~

这样调用方能看见失败，也能在测试中注入不同配置。

资源清理遵循“成功获取后立即 defer”：

~~~text
打开成功
    -> 立刻 defer Close
        -> 后续逻辑任意 return 都会清理
~~~

## 八、一句话总结

**init 决定程序开始前发生什么，defer 决定函数返回前发生什么；判断输出时只追踪“何时求值、何时调用、何时退出”。**

## 九、核心问答

### 1. init 在 main 前执行吗？顺序只看 import 文本吗？

会在 main 前执行；初始化按包依赖关系展开，不是简单照抄 import 文本顺序。项目不应依赖多个 init 的细节顺序。

### 2. 多个 defer 的执行顺序是什么？

后进先出。最后登记的 defer 最先执行。

### 3. defer fmt.Println(n) 为什么可能与 defer func() { fmt.Println(n) }() 不同？

直接调用的参数在登记时求值；闭包在真正执行时读取 n 的当前值。

### 4. defer 能修改返回值吗？

能。无名返回值通常已经复制到返回槽，修改局部变量不影响结果；有名返回值就是返回槽，defer 可以修改它。

### 5. defer 是不是 Go 版 finally？

用途相似，但生命周期不同：defer 绑定当前函数返回，不绑定任意代码块；并且多个 defer 有明确的 LIFO 顺序。

## 十、自测与答案

### 先独立作答

1. 下列代码输出什么？

~~~go
func f() int {
	n := 1
	defer fmt.Println(n)
	n += 100
	return n
}
~~~

2. 下列代码输出什么？

~~~go
func g() (n int) {
	n = 1
	defer func() { n += 100 }()
	return n
}
~~~

3. defer 写在 if 块中，if 结束时会执行吗？
4. 为什么资源获取成功后应立即 defer Close？
5. 什么时候不建议用 init？

<details>
<summary>答案</summary>

1. 输出 101；defer 保存的是 1，但 return 表达式的结果是 101。
2. 返回 101；n 是有名返回值，defer 修改了返回值槽。
3. 不会，等当前函数返回时才执行。
4. 这样后续所有 return 路径都自动执行清理，降低遗漏概率。
5. 需要返回错误、依赖运行时配置、需要可测试或会产生明显外部副作用时，改用显式初始化函数。

</details>
