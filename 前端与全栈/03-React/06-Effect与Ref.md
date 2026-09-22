# Effect 与 Ref

> 优先级：⭐ / △

## 一、是什么

- Effect 用于把组件与 React 外部系统同步。
- Ref 用于保存不会触发重新渲染的可变值，或访问 DOM 节点。

## 二、为什么需要

组件需要连接浏览器 API、订阅、计时器、第三方控件或 DOM 时，不能把这些操作放在渲染阶段。Ref 则适合保存不参与 UI 计算的实例信息。

## 三、核心用法

### Effect

~~~tsx
useEffect(() => {
  const connection = createConnection(roomId)
  connection.connect()

  return () => {
    connection.disconnect()
  }
}, [roomId])
~~~

输入：依赖 roomId；效果：连接同步；清理：断开连接。

### Ref

~~~tsx
const inputRef = useRef<HTMLInputElement>(null)

function focusInput() {
  inputRef.current?.focus()
}

return <input ref={inputRef} />
~~~

### 保存不触发渲染的值

~~~tsx
const timerRef = useRef<number | null>(null)
~~~

## 四、核心原理

### Effect 是同步，不是事件

事件处理器表示“用户做了某事”；Effect 表示“渲染完成后，组件需要与外部系统保持同步”。

### 依赖数组

依赖数组描述 Effect 使用的响应式值。值改变时，React 先执行旧清理，再执行新 Effect。

### Ref 和 State 的区别

| 对比 | State | Ref |
| --- | --- | --- |
| 改变后渲染 | 会 | 不会 |
| 用于 UI 输出 | 是 | 通常不是 |
| 适合保存 | 页面状态 | DOM、定时器、实例、最新值 |

## 五、常见场景

- 订阅和取消订阅。
- 定时器。
- 浏览器事件监听。
- DOM 聚焦和测量。
- 第三方编辑器或播放器。

不适合用 Effect 的场景：

- 根据 Props 计算数据。
- 处理点击、提交等用户事件。
- 只是为了把一个 State 复制成另一个 State。

## 六、踩坑点

1. Effect 不是默认的数据请求工具。
2. 依赖数组不能靠删依赖解决报错。
3. Effect 必须考虑清理，否则会重复订阅和泄漏。
4. Ref 改变不会触发 UI 更新。
5. 不要在渲染阶段读取并修改 DOM。
6. 严格模式下开发环境可能执行额外的 setup/cleanup，用来发现不安全副作用。

## 七、项目中的实际使用

网络请求应优先考虑框架或数据请求方案；必须在组件中请求时，至少处理：

~~~text
开始请求
→ 记录 loading
→ 成功更新 data
→ 失败更新 error
→ 清理或取消过期请求
~~~

派生数据直接计算：

~~~tsx
const visibleNotes = notes.filter((note) =>
  note.title.includes(keyword)
)
~~~

不要把 visibleNotes 再放进 Effect 和另一个 State。

## 八、一句话总结

Effect 用来同步外部系统，Ref 用来保存不触发渲染的值；能在渲染或事件中解决的问题，不要用 Effect。

## 九、核心问答

### 1. Effect 和事件处理器有什么区别？

事件处理器响应明确的用户动作；Effect 响应渲染和依赖变化，用于同步外部系统。

### 2. 为什么派生数据通常不需要 Effect？

它可以由当前 Props 和 State 直接计算，加入 Effect 会增加额外状态和同步风险。

### 3. Ref 改变为什么不更新界面？

Ref 的设计就是保存可变引用但不触发重新渲染。

### 4. Effect 为什么需要 cleanup？

避免旧订阅、定时器或连接在组件更新和卸载后继续运行。

## 十、自测与答案

### 题目

1. 什么情况下应该使用 Effect？
2. 如何在组件中保存定时器 ID？
3. visibleNotes 是否应该单独存 State？
4. State 和 Ref 的核心区别是什么？

<details>
<summary>查看答案</summary>

1. 需要与组件外部系统同步时。
2. 使用 useRef 保存，不需要因为 ID 改变而渲染。
3. 通常不应该，它可以由 notes 和 keyword 直接计算。
4. State 改变会触发渲染，Ref 改变不会。

</details>
