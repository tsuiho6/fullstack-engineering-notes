# Go 语言简明教程：核心主干 + 最小闭环 + 主动回忆

> 基于[《Go 语言简明教程》](https://geektutu.com/post/quick-golang.html)重组。原文发表于 2019 年，示例以 Go 1.13 为背景；本笔记保留原理，并按当前 Go 项目习惯修正代码与工具链。

## 0. 先建立总心智模型

Go 的学习主线不是把语法背完，而是把一次真实改动走通：

~~~text
模块 module
  -> 包 package
    -> 类型与数据
      -> 函数与错误
        -> 结构体 / 方法 / 接口
          -> 并发与取消
            -> 测试、构建、交付
~~~

### 优先级

- ⭐ 必须掌握：模块与包、零值、:=、字符串/切片/map、函数多返回值、error、结构体与方法、接口、goroutine/channel、测试。
- △ 理解即可：数组内部表示、指针细节、方法集、defer/recover、接口动态值、竞态的成因。
- ○ 知道存在：fallthrough、new、空接口承载任意数据、泛型/模糊测试等扩展主题。

### 原文中需要更新的地方

1. 不要照抄 Go 1.13.6；安装时看[官方稳定版本](https://go.dev/dl/)，项目实际支持的版本以 go.mod 为准。
2. 不再围绕 GO111MODULE=on 讲解；新项目直接在模块目录执行 go mod init。官方流程见[创建 Go 模块](https://go.dev/doc/tutorial/create-module)和[Modules Reference](https://go.dev/ref/mod)。
3. errorw.New 是原文笔误，应为 errors.New；现代项目还应掌握 fmt.Errorf("...: %w", err)、errors.Is、errors.As。
4. interface{} 仍然有效，但 Go 1.18 起通常写 any；二者是别名，动态类型只应出现在 JSON、插件、通用容器等边界。[官方 JSON 教程](https://go.dev/doc/tutorial/json)有 any 示例。
5. 并发示例中的 string(i+'0') 只适合演示单个数字；项目代码用 strconv.Itoa(i) 或 fmt.Sprintf("%d", i)。

---

# 一、项目入口：模块、包与最小运行闭环

## 一、是什么

- 包 package：一组相关 Go 文件的编译单元；同一目录通常对应一个包。
- 模块 module：一个或多个包的版本与依赖边界，由 go.mod 标识。
- 可执行程序：package main 中的 func main() 是入口。

## 二、为什么需要

没有包，代码难以组织；没有模块，依赖版本不可复现；没有固定命令闭环，常见问题会变成“本机能跑、换目录就报错”。

## 三、核心用法

~~~powershell
mkdir hello
cd hello
go mod init example.com/hello
go run .
go fmt ./...
go test ./...
go build ./...
~~~

最小程序：

~~~go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go")
}
~~~

### 必须区分两个命令

~~~powershell
go run main.go  # 只编译 main.go
go run .        # 编译当前目录下整个 package main
~~~

跨包使用时，导出名首字母大写：

~~~go
// package calc
func Add(a, b int) int { return a + b }

// package main
fmt.Println(calc.Add(1, 2))
~~~

## 四、核心原理

模块路径是包导入路径的前缀；go.mod 描述模块本身和依赖，go.sum 保存依赖校验信息。目录移动、模块名修改、导入路径修改，通常要一起检查。

## 五、项目中的实际使用

一个小项目至少要形成以下闭环：

~~~text
go mod init
  -> 写代码
    -> gofmt
      -> go test ./...
        -> go vet ./...
          -> go test -race ./...
            -> go build ./...
~~~

go run . 适合开发期运行，go build 适合验证能否生成可交付程序；依赖变动后再用 go mod tidy 整理 go.mod。

## 六、踩坑点

- go run main.go 找不到同包其他文件中的函数：改用 go run .。
- 包内文件必须使用相同 package 名；测试可以选择 package x 或 package x_test，后者只测试公开行为。
- 函数、类型、字段小写只在包内可见；不要把“能否导出”误认为“是否安全”。
- 原文建议固定 GOPROXY，但代理是环境和组织策略问题，不要把某个镜像写成所有机器的必选项。

## 七、一句话总结

**Go 项目先以 module 定边界，再以 package 组织代码，开发命令优先围绕 go run .、go test ./... 和 go build ./...。**

---

# 二、值、类型与数据容器：先搞懂“数据长什么样”

## 一、是什么

Go 是静态强类型语言；每个变量都有确定类型，没有显式初始化时得到该类型的零值。

| 类型 | 零值 | 高频用途 |
|---|---|---|
| int | 0 | 下标、长度、普通计算 |
| int64 | 0 | 明确位宽的 ID、时间、协议字段 |
| float64 | 0 | 一般浮点计算 |
| bool | false | 状态判断 |
| string | "" | 文本或原始字节序列 |
| 指针、slice、map、channel、interface、func | nil | 尚未指向/初始化/赋值 |

## 二、核心用法

### 1. var 与 :=

~~~go
var count int       // 声明，零值 0
var name = "go"     // 根据右值推断类型

func f() {
	ready := true
	count, err := 1, doWork() // 至少有一个新变量
	_, _, _ = ready, count, err
}
~~~

:= 只能在函数体内使用；不要因追求简短而让变量类型和作用域变得不清楚。

### 2. 字符串：byte、rune、字符数不是一回事

~~~go
s := "Go语言"
fmt.Println(len(s))       // 字节数：8
fmt.Println(s[2])         // 第 3 个 byte，不是“语”
fmt.Println([]rune(s)[2]) // 第 3 个 Unicode code point

for i, r := range s {     // i 是字节下标，r 是 rune
	fmt.Println(i, r)
}
~~~

- string 保存字节；字符串字面量通常是合法 UTF-8。
- byte 是 uint8，适合二进制或按字节处理。
- rune 是 int32 的别名，适合按 Unicode code point 处理。
- 用户感知字符还涉及 Unicode 组合字符；code point 数不一定等于视觉字符数。

字符串细节可对照 Go 官方的[strings、bytes、runes 说明](https://go.dev/blog/strings)。

### 3. 数组与切片

~~~go
var a [3]int = [3]int{1, 2, 3} // 长度写进类型，不能改变

s := make([]int, 0, 4) // len=0, cap=4
s = append(s, 1, 2, 3)
part := s[1:3]         // 半开区间 [1, 3)
~~~

切片的关键 shape：

~~~text
slice = 指向底层数组的指针 + len + cap
~~~

因此：

- len(s) 是当前元素个数；cap(s) 是从起点算起可扩展的容量。
- append 可能复用底层数组，也可能分配新数组；必须接住返回值。
- 子切片与原切片可能共享底层数组。
- 长期保存一个很小的子切片，可能让大底层数组无法回收；需要时复制。

~~~go
small := append([]byte(nil), large[100:110]...) // 独立副本

// slices.Concat 会创建一个全新的切片，不会影响任何原切片
combined := slices.Concat(sub1, sub2)
~~~

### 4. map

~~~go
scores := make(map[string]int)
scores["Go"] = 100

score, ok := scores["Rust"] // ok 区分“不存在”和“值为零”
_ = score
_ = ok

delete(scores, "Go")
~~~

map 的 key 必须是可比较类型；slice 不能作为 key。遍历顺序不保证稳定，不能拿 map 直接做有序输出或快照比较。

### 5. 指针、make 与 new

~~~go
func increment(n *int) { *n = *n + 1 }

n := 1
increment(&n)
~~~

- Go 的参数传递始终是按值传递。
- 传 *T 是复制地址，函数可以修改地址指向的对象。
- slice、map、channel 本身也是按值传递，但携带对底层数据的引用；函数可能修改元素，却不能可靠地替调用者更新 slice 头部。
- make 只用于 slice、map、channel，返回可直接使用的值。
- new(T) 返回 *T，得到零值对象；业务代码通常更常用结构体字面量或 &T{}。

~~~go
func add(s []int, x int) []int {
	return append(s, x) // 可能产生新底层数组，必须返回
}
~~~

## 三、常见场景

- 默认优先用 slice，不要把固定数组误当成普通容器。
- 需要去重、索引、缓存、计数时用 map。
- 需要与 C、文件、网络协议打交道时按 byte 处理；需要人类文本遍历时按 rune 或更高层文本规则处理。
- 只有在需要共享可变状态、避免大对象复制、表达“可选对象”时才引入指针。

## 四、踩坑点

1. **nil map**：读取、len、range、delete 安全；写入会 panic。写入前 make。
2. **nil slice**：可以 len、range、append；不要把 nil slice 和空但已分配 slice 混为一谈。
3. **:= 变量遮蔽**：内层重新声明 err，可能导致外层 err 仍为 nil。
4. **map 顺序**：测试和输出需要稳定顺序时，先取 key 到 slice，再排序。
5. **共享 slice**：把子切片传给异步任务前，确认是否允许共享底层数组；否则复制。
6. **shape/dtype/device 检查**：Go 没有机器学习意义上的 device；通用检查应换成“类型、len、cap、nil、所有权/并发访问”。

## 五、一句话总结

**先看零值和静态类型，再看数据是否共享；slice 关心 len/cap，string 关心 byte/rune，map 关心 nil/顺序/并发。**

---

# 三、控制流、函数与错误：把失败作为返回值设计

## 一、是什么

Go 的控制流很少但明确：if、for、switch；函数通过参数和返回值传递数据，通常通过最后一个 error 返回可预期失败。

## 二、核心用法

~~~go
if n, err := strconv.Atoi(text); err != nil {
	return fmt.Errorf("parse count: %w", err)
} else if n < 0 {
	return errors.New("count must be non-negative")
}
~~~

~~~go
for i := 0; i < 3; i++ {}

for i, value := range values {
	_, _ = i, value
}

switch status {
case "ready":
case "failed":
default:
}
~~~

函数优先写清输入、输出和失败条件：

~~~go
func FindTask(tasks []Task, id int) (Task, error) {
	for _, task := range tasks {
		if task.ID == id {
			return task, nil
		}
	}
	return Task{}, fmt.Errorf("task %d: %w", id, ErrNotFound)
}
~~~

## 三、核心原理

### 1. error 是值，不是异常开关

调用方要么处理、要么包装后继续返回：

~~~go
if err != nil {
	return fmt.Errorf("load config: %w", err)
}
~~~

错误链的意义是：外层补充上下文，底层错误身份仍可被识别。

~~~go
if errors.Is(err, ErrNotFound) {
	// ...
}

var pathErr *os.PathError
if errors.As(err, &pathErr) {
	// ...
}
~~~

不要用字符串匹配判断错误类型；可参考[Errors are values](https://go.dev/blog/errors-are-values)和[errors 包文档](https://go.dev/pkg/errors/)。

### 2. panic 与 recover

- error：调用者可以预期并处理的失败，如参数无效、文件不存在、网络超时。
- panic：程序无法继续维持约束的严重错误，或运行时错误。
- recover：只能在同一 goroutine 的 deferred 函数中恢复 panic。

业务函数不要用 panic 代替普通错误；recover 通常只放在进程边界、请求入口、任务执行器等隔离层。机制见[Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover)。

### 3. defer

~~~go
f, err := os.Open(name)
if err != nil {
	return err
}
defer f.Close()
~~~

defer 在当前函数返回前执行，多个 defer 后进先出。资源打开成功后立即注册释放动作；不要把大量 defer 放在超长循环里。

## 四、项目中的实际使用

推荐错误流程：

~~~text
底层：返回原始错误
  -> 当前层：增加业务上下文并用 %w 包装
    -> 边界层：转换为日志、HTTP 状态码或用户可见消息
~~~

日志应记录上下文，用户消息不必暴露文件路径、SQL 或内部堆栈。

## 五、踩坑点

- 忽略错误：只在明确知道错误无意义时才使用空标识符。
- 用 err.Error() 做分支判断：改用 errors.Is/As。
- recover 不在 defer 中：恢复不到。
- defer 参数在注册时求值，不是在执行时求值。
- 简单函数优先显式 return，少用容易造成遮蔽的裸 return。

## 六、一句话总结

**正常失败走 error 返回链，真正失控才 panic；defer 管清理，边界层才考虑 recover。**

---

# 四、结构体、方法与接口：用行为组合，而不是类继承

## 一、是什么

- struct：把相关数据组合成一个类型。
- method：带 receiver 的函数，把行为绑定到类型。
- interface：只描述行为集合；类型只要实现方法，就自动满足接口。

## 二、核心用法

~~~go
type Task struct {
	ID    int
	Title string
	Done  bool
}

func (t *Task) Complete() error {
	if t.Done {
		return errors.New("task already completed")
	}
	t.Done = true
	return nil
}
~~~

receiver 选择：

- *T：要修改对象、对象较大、或希望保持方法集合一致。
- T：对象小、值语义清楚、希望自然复制。

接口通常由使用方定义，且尽量小：

~~~go
type Saver interface {
	Save(context.Context, Task) error
}

type MemorySaver struct {
	Tasks []Task
}

func (s *MemorySaver) Save(_ context.Context, t Task) error {
	s.Tasks = append(s.Tasks, t)
	return nil
}

var _ Saver = (*MemorySaver)(nil) // 编译期接口检查
~~~

安全类型断言：

~~~go
if saver, ok := value.(Saver); ok {
	_ = saver
}
~~~

## 三、核心原理

### 方法集决定接口满足关系

如果方法用 func (t *Task) Complete() 定义，通常是 *Task 满足相关接口，而 Task 未必满足。这是“明明写了方法却不能传入接口”的常见原因。

### 接口值不是单纯的指针

接口值可理解为“动态类型 + 动态值”：

~~~go
var p *Task = nil
var x any = p
fmt.Println(x == nil) // false
~~~

这也是 typed nil error 的来源。返回错误时直接返回字面量 nil，不要把 nil 指针装进 error 接口。

### 接口的项目价值

接口不是为了模拟 Java 的所有抽象，而是为了让调用方依赖行为，从而替换实现、隔离外部系统、方便测试。只有出现多实现、外部边界或明确测试隔离点时才引入接口。

## 四、常见场景

- HTTP handler、文件读写、数据库、消息队列等外部边界。
- 测试替身：用内存实现替换真实存储。
- 多个实现共享同一段业务流程。

不适合：只有一个实现、没有替换需求、接口方法很多且调用方不需要全部行为。

## 五、踩坑点

- new(T) 与 &T{} 都能得到指针，但不要因此把所有构造都包装成工厂。
- 小写字段跨包不可见；跨包构造通常使用导出字段或构造函数。
- 类型断言 v.(T) 失败会 panic；不确定时使用 v, ok := ...。
- any 让编译器失去类型约束；核心业务模型应保留具体类型。
- 接口应定义在消费者一侧，方法数越少越容易替换和组合。

## 六、一句话总结

**struct 管数据，method 管对象行为，interface 管调用方所需行为；依赖接口是为了替换实现，不是为了堆抽象。**

---

# 五、并发：goroutine 只是开始，生命周期和共享状态才是重点

## 一、是什么

- goroutine：由 go 启动的并发执行单元。
- WaitGroup：等待一组 goroutine 结束。
- channel：在 goroutine 之间传递值并建立同步关系。
- context.Context：传播取消、截止时间和请求范围。

并发不等于并行：并发是组织多个独立进行的任务，并行是多个 CPU 同时执行计算。

## 二、核心用法

### 1. 只需要等待：WaitGroup

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

Add 在启动 goroutine 前完成，Done 用 defer 保证每条退出路径都会执行。

### 2. 需要传递结果：channel

~~~go
results := make(chan Result)

go func() {
	defer close(results) // 发送方完成后关闭
	for _, job := range jobs {
		results <- run(job)
	}
}()

for result := range results {
	consume(result)
}
~~~

关闭 channel 表示不会再有值发送，通常由发送方关闭；接收方不要抢着关闭。

### 3. 需要取消：context + select

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

创建超时 context 后要 defer cancel()。官方说明见[Canceling in-progress operations](https://go.dev/doc/database/cancel-operations)。

## 三、核心原理

### 三个问题必须分开

~~~text
谁启动？              go f()
谁等待？              WaitGroup / channel
谁取消？              context
谁保护共享状态？      mutex / channel / 不共享
~~~

channel 解决通信和部分同步问题，但不会自动保护所有共享变量。两个 goroutine 同时读写 map 或普通变量，仍可能产生数据竞争。

### 竞态检测

~~~powershell
go test -race ./...
~~~

它只能发现运行到的路径中的竞态，不能证明程序绝对没有竞态；但应作为并发代码的常规验证步骤。[Go Race Detector](https://go.dev/doc/articles/race_detector)给出了使用方式和限制。

## 四、项目中的实际使用

- IO 密集型任务：goroutine + 有界 worker pool + channel。
- 请求级任务：从 http.Request.Context() 继续向下传递，不要在业务层重新创建无关的 background context。
- 共享计数器或缓存：优先判断能否改成单所有者 goroutine；不能时用 sync.Mutex 或其他明确同步方案。
- 启动 goroutine 前先回答：谁等待、谁关闭 channel、谁取消、错误后其他任务怎么办。

## 五、踩坑点

1. 用 time.Sleep 等待 goroutine：用 WaitGroup、channel 或 context。
2. 忘记 Done：Wait 永久阻塞；用 defer wg.Done()。
3. 循环变量问题：通过函数参数传入当前值。
4. 关闭 channel 后继续发送：会 panic；多个发送者时由统一协调者关闭。
5. nil channel：发送和接收都会永久阻塞。
6. 认为“用了 channel 就没有竞态”：channel 之外访问的共享状态仍需同步。
7. goroutine 泄漏：没有退出条件、没有关闭输入、没有监听 ctx.Done()。

## 六、一句话总结

**并发代码的完成标准不是“加了 go”，而是启动、通信、等待、取消、共享状态保护和退出路径都可解释。**

---

# 六、测试：把最小闭环变成可重复验证

## 一、是什么

Go 用文件名和函数命名约定提供内置测试：*_test.go 中的 TestXxx(t *testing.T) 会被 go test 发现并执行。

## 二、核心用法

~~~go
func TestFindTask(t *testing.T) {
	tests := []struct {
		name    string
		id      int
		wantErr error
	}{
		{name: "found", id: 1},
		{name: "missing", id: 9, wantErr: ErrNotFound},
	}

	tasks := []Task{{ID: 1, Title: "learn Go"}}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := FindTask(tasks, tt.id)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("FindTask() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}
~~~

常用命令：

~~~powershell
go test ./...
go test -v ./...
go test -race ./...
go test -cover ./...
~~~

官方测试教程见[Add a test](https://go.dev/doc/tutorial/add-a-test)。

## 三、测试什么

- 输入、输出、错误类型和边界行为。
- 空 slice、nil map、重复调用、超时、取消、并发退出。
- 对外行为，而不是某个私有函数的具体实现步骤。

## 四、踩坑点

- 只测 happy path，不测错误分支。
- 依赖 map 遍历顺序；测试应先排序，或比较无序集合。
- 并发测试没有 -race；竞态往往不是每次都触发。
- 用 t.Fatal 后仍期待当前测试继续；Fatal 会终止当前测试函数。

## 五、一句话总结

**测试的最小单位是“可观察行为 + 边界输入 + 错误语义”，而不是把代码行数覆盖一遍。**

---

# 七、最小项目闭环：用一个待办模型串起来

## 一、目标

不再逐个背语法，完成一个足够小但包含主干的模型：

~~~text
Task 数据
  -> Add / Find / Complete 函数
    -> error 返回与包装
      -> 方法修改状态
        -> 可替换的 Saver 接口
          -> 单元测试
~~~

## 二、推荐最小结构

~~~text
todo/
├── go.mod
├── task.go
├── task_test.go
└── cmd/todo/main.go
~~~

教学阶段可以先把 main.go 和业务文件放在同一 package；项目变大后，再把可执行入口放到 cmd/，把业务放到独立 package。

## 三、核心模型

~~~go
var ErrNotFound = errors.New("task not found")

type Task struct {
	ID    int
	Title string
	Done  bool
}

func Add(tasks []Task, title string) ([]Task, error) {
	if strings.TrimSpace(title) == "" {
		return tasks, errors.New("title is empty")
	}
	t := Task{ID: len(tasks) + 1, Title: title}
	return append(tasks, t), nil
}

func (t *Task) Complete() error {
	if t.Done {
		return errors.New("task already completed")
	}
	t.Done = true
	return nil
}
~~~

## 四、推荐工作流

1. 先定义数据和不变量：标题不能为空，完成任务不能再次完成。
2. 写最小函数，让失败通过 error 暴露。
3. 为正常、边界、失败路径写表驱动测试。
4. 需要替换外部存储时再定义小接口，不要一开始设计十层接口。
5. 最后加入并发、取消、日志和持久化；每次只引入一个新变量。

## 五、教学演示与项目推荐的区别

| 教学演示 | 项目推荐 |
|---|---|
| 全部写在 main.go | 入口与业务 package 分开 |
| 用 fmt.Println 看结果 | 用返回值、日志和测试验证行为 |
| 用 time.Sleep 模拟并发 | 用 context、WaitGroup、channel 管理生命周期 |
| 用 interface{} 装任何值 | 核心域模型使用具体类型 |
| 直接打印 err | 包装错误、边界层转换、保留错误身份 |

## 六、一句话总结

**一个能被测试、能返回错误、能替换外部依赖并能明确退出的待办模型，就是这篇教程的最小闭环。**

---

# 八、总目录与推荐学习顺序

## 总目录

1. 项目入口：module、package、main、go run .
2. 值与类型：零值、声明、字符串、数组、slice、map、指针
3. 控制流与函数：if、for、switch、多返回值
4. 错误处理：error、包装、panic、defer、recover
5. 建模：struct、method、pointer receiver
6. 抽象：interface、类型断言、typed nil
7. 并发：goroutine、WaitGroup、channel、context、race
8. 测试：*_test.go、表驱动测试、go test ./...
9. 最小项目：把上述内容串成可运行、可测试、可交付的闭环

## 推荐学习顺序

### 第 1 阶段：能写、能运行

模块/包 -> 变量/零值 -> slice/map -> if/for -> 函数和多返回值。

验收：能写一个从输入创建 slice、用 map 统计、返回结果和错误的命令行程序。

### 第 2 阶段：能建模、能维护

struct -> 方法 -> 指针 receiver -> interface -> errors.Is/As。

验收：能解释值接收者和指针接收者的差异，能为外部依赖定义一个小接口。

### 第 3 阶段：能并发、能收尾

goroutine -> WaitGroup -> channel -> context -> race detector。

验收：能写一个有退出条件的 worker pool，不靠 sleep 判断完成。

### 第 4 阶段：能验证、能交付

表驱动测试 -> go test ./... -> go test -race ./... -> go vet ./... -> go build ./...。

验收：修改代码后能用自动化命令证明行为没有回退。

---

# 九、核心问答

1. **数组和 slice 的根本区别是什么？**  
   数组长度属于类型且不可变；slice 是指向底层数组的描述符，包含指针、len、cap，适合绝大多数序列处理。

2. **为什么函数接收 []T 后能修改元素，却不能保证外部 slice 长度变化？**  
   传入的是 slice 描述符的副本；它仍指向同一底层数组，所以元素修改可见，但 append 可能换底层数组，新的描述符必须返回给调用方。

3. **什么时候返回 error，什么时候使用 panic？**  
   可预期、可恢复、调用方能处理的失败返回 error；违反程序不变量或进程边界需要兜底时才考虑 panic，recover 只放在隔离边界。

4. **Go 的接口为什么不需要 implements？**  
   它采用结构化满足关系：类型只要实现接口方法集合就满足接口；编译期断言 var _ I = (*T)(nil) 可显式检查。

5. **WaitGroup、channel、context 分别解决什么问题？**  
   WaitGroup 等待结束，channel 传递数据并同步，context 传播取消/截止时间；三者不能互相替代。

---

# 十、自测与答案

## 先独立作答

1. var m map[string]int 后执行 m["x"] = 1 会发生什么？如何修复？
2. s2 := s1[:1] 后对 s2 执行 append，为什么可能改变 s1？
3. 为什么 len("Go语言") 不等于人类理解的字符数？遍历文本应优先用什么？
4. 一个 goroutine 向 channel 发送结果，主 goroutine 如何可靠判断“全部结束”，而不是靠 time.Sleep？
5. 为什么下面的返回值可能让调用方得到一个非 nil 的 error？

~~~go
func f() error {
	var e *MyError
	return e
}
~~~

<details>
<summary>答案</summary>

1. 会 panic，因为 nil map 不能写入；使用 m = make(map[string]int) 初始化。	
2. 因为 s1、s2 可能共享同一底层数组，append 在容量足够时会直接写入原数组；需要独立副本时复制 slice。
3. Go 的 string 以字节保存，中文通常占多个 UTF-8 字节；按 Unicode code point 处理时使用 range 或 []rune，但视觉字符还可能涉及组合字符。
4. 让发送方在所有发送完成后 close(ch)，接收方用 for v := range ch 读取到关闭；若有多个发送者，可由统一协调者关闭。
5. e 虽然指针值为 nil，但装入 error 后接口已有动态类型 *MyError，接口本身不为 nil；失败时直接返回 nil interface，或返回具体的非 nil 错误。

</details>

---

# 十一、跨章节综合问答

## 场景：写一个并发读取任务并保存结果的服务

**问题 1：任务列表用数组、slice 还是 map？**  
按批次顺序处理用 slice；按 ID 高频查找用 map[int]Task；两者同时存在时必须定义事实来源以及同步方式。

**问题 2：保存接口应该返回什么？**  
优先返回 error，必要时返回生成的 ID 或结果；底层保留具体错误，上层用 %w 增加上下文，边界层用 errors.Is/As 判断。

**问题 3：如何让任务在客户端断开后停止？**  
从请求获得 ctx，向 worker、数据库和下游调用传递；每个可能阻塞的循环或调用都监听 ctx.Done()，创建派生超时 context 后 defer cancel()。

**问题 4：如何防止 worker 永久泄漏？**  
明确输入 channel 的关闭方；worker 同时监听输入关闭和 ctx.Done()；主流程等待 worker 退出，错误发生时取消其他 worker。

**问题 5：如何验证并发结果？**  
先测纯业务函数，再测关闭、取消、超时和错误传播；执行 go test ./... 与 go test -race ./...，不要以输出顺序判断正确性。

**问题 6：什么时候引入接口？**  
当真实存储需要被内存存储替换、业务需要隔离外部系统或确实存在多实现时；不要为一个永远只有单实现的内部函数提前抽象。

---

# 最终记忆锚点

**Go 的主干不是“语法很多”，而是：用 module/package 组织边界，用具体类型表达数据，用函数返回 error，用 struct/method 建模，用小 interface 隔离变化，用 goroutine/channel/context 管并发任务的生命周期，再用 test/race/build 把结果变成可验证的程序。**

## 学完后的自检标准

- 能解释：slice 为什么共享、interface 为什么会 typed nil、error 为什么要包装。
- 能写出：一个带错误返回的函数、一个指针 receiver 方法、一个表驱动测试、一个可取消 worker。
- 能判断：何时用 slice/map/struct/interface/channel/mutex。
- 能避开：nil map 写入、map 顺序依赖、append 丢返回值、panic 替代 error、goroutine 无退出、go run main.go 漏编译文件。
