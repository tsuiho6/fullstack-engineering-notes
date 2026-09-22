# 状态提升、Context 与 Reducer

> 优先级：⭐ / △

## 一、是什么

- 状态提升：把共享状态移动到最近的共同父组件。
- Context：跨层级提供和读取数据。
- Reducer：用 action 描述事件，用纯函数集中计算下一状态。

## 二、为什么需要

当多个组件需要同一份数据时，各自保存 State 会产生不同步；当 Props 需要穿过很多层时，Context 可以减少传递噪音；当状态转换复杂时，Reducer 可以集中规则。

## 三、核心用法

### 状态提升

~~~tsx
function Parent() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <>
      <List selectedId={selectedId} onSelect={setSelectedId} />
      <Detail selectedId={selectedId} />
    </>
  )
}
~~~

### Context

~~~tsx
type Theme = 'light' | 'dark'

const ThemeContext = createContext<Theme | null>(null)

function useTheme() {
  const value = useContext(ThemeContext)
  if (value === null) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return value
}
~~~

### Reducer

~~~tsx
type State = { count: number }
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 }
    case 'decrement':
      return { count: state.count - 1 }
  }
}
~~~

## 四、核心原理

### 状态拥有者

状态应该放在“需要读取它的组件的最近共同祖先”中。放得太低会导致重复和不同步；放得太高会让无关组件频繁参与。

### Context 不是全局状态管理器

Context 解决的是跨层级传值；当 Provider 的 value 改变时，读取该 Context 的组件会更新。

### Reducer 是状态转换表

~~~text
旧 State + Action → 新 State
~~~

Reducer 应该是纯函数，不直接请求网络、修改 DOM 或修改旧 State。

## 五、常见场景

- 状态提升：兄弟组件共享筛选、选中项。
- Context：主题、语言、当前用户、表单上下文。
- Reducer：多步骤表单、编辑器、复杂列表状态。

## 六、踩坑点

1. Context 不是避免所有 Props 的理由。
2. 不要把所有业务状态都塞进一个 Context。
3. Context value 每次创建新对象可能引起不必要更新。
4. Reducer 不要直接修改 state。
5. Action 应表达发生了什么，而不是暴露组件内部操作。

## 七、项目中的实际使用

先用状态提升解决问题；出现明显的跨层级传递或状态转换复杂时，再引入 Context/Reducer。

例如学习资料应用可以把：

- 当前主题放进 ThemeContext。
- 当前用户放进 AuthContext。
- 编辑器的打开、修改、保存、失败放进 noteReducer。

不要把所有 API 数据和页面状态默认放进 Context。

## 八、一句话总结

状态提升解决共享来源，Context 解决跨层级传值，Reducer 解决复杂状态转换；三者不是同一种工具。

## 九、核心问答

### 1. 状态应该提升到哪里？

提升到需要共享它的组件最近的共同父组件。

### 2. Context 和状态提升有什么区别？

状态提升改变状态拥有者位置；Context 改变传值方式，允许跨层级读取。

### 3. Reducer 什么时候比多个 setter 更合适？

状态转换多、事件类型多、规则需要集中测试时。

### 4. 为什么 Reducer 必须纯？

纯函数可预测、可测试，也避免状态转换和外部副作用互相纠缠。

## 十、自测与答案

### 题目

1. 两个兄弟组件共享 selectedId 时，状态放在哪里？
2. Context 最适合解决什么问题？
3. Reducer 的输入和输出是什么？
4. 为什么不能直接修改 reducer 的 state？

<details>
<summary>查看答案</summary>

1. 放到它们最近的共同父组件。
2. 跨层级提供和读取相对稳定的上下文数据。
3. 旧 State 和 Action，输出新 State。
4. 会破坏不可变更新和可预测性，导致更新检测及调试困难。

</details>
