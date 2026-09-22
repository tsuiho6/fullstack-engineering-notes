# TSX 与 React 类型桥接

> 优先级：⭐ / △
> 说明：这里只整理 TypeScript 如何服务 React，不替代 React 专题。

## 一、是什么

TSX 是允许 JSX 语法的 TypeScript 文件。TypeScript 负责检查组件 Props、事件、状态和返回结构；React 负责运行时渲染和交互。

## 二、为什么需要

React 项目中的类型错误通常出现在数据流边界：

- Props 传错字段
- 事件对象类型不清
- State 的初始值过窄或过宽
- API 数据和组件需要的数据不一致
- children 和可选属性混乱

## 三、核心用法

### Props

~~~tsx
type ButtonProps = {
  label: string
  disabled?: boolean
  onClick: () => void
}

function Button({ label, disabled = false, onClick }: ButtonProps) {
  return (
    <button disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}
~~~

输入：ButtonProps；输出：JSX 元素。

### State

~~~tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState<User | null>(null)
~~~

初始值无法表达完整状态时，显式写泛型。

### 事件

~~~tsx
function SearchInput() {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    console.log(event.target.value)
  }

  return <input onChange={handleChange} />
}
~~~

### children

~~~tsx
type PanelProps = {
  children: React.ReactNode
}
~~~

ReactNode 能表达文本、元素、数组、空值等可渲染内容。

## 四、核心原理

JSX 不是 HTML 字符串，而是 JavaScript/TypeScript 中的一种表达语法。组件本质上仍然是函数，Props 本质上仍然是函数参数。

~~~text
组件函数
→ 接收 Props
→ 根据 State 和 Props 返回 JSX
→ React 负责运行时更新
~~~

类型检查只能保证组件调用形式和代码关系，不会替你检查服务端返回的真实 JSON。

## 五、常见场景

- 组件 Props。
- 表单事件。
- 列表数据。
- loading、error、empty 状态。
- React Context 和自定义 Hooks。

## 六、踩坑点

1. 不要为了省事把 Props 写成 any。
2. 不要用类型断言掩盖 API 数据不可信。
3. useState 初始值 null 时，后续对象状态通常需要显式联合类型。
4. 不要把所有组件都强行写成 React.FC；普通函数加 Props 类型更直接。
5. children 不是永远是字符串。
6. 事件类型应该根据实际元素选择，不要使用过宽的 Event。

## 七、项目中的实际使用

先定义领域类型，再定义组件 Props：

~~~tsx
type Note = {
  id: string
  title: string
  content: string
}

type NoteCardProps = {
  note: Note
  onSelect: (id: string) => void
}
~~~

组件只接收它真正需要的数据，不直接依赖完整数据库记录，避免后端变化扩大影响范围。

## 八、一句话总结

React 组件是函数，Props 是输入，JSX 是输出；TypeScript 的任务是把组件边界和数据流描述清楚。

## 九、核心问答

### 1. TSX 和 JSX 有什么区别？

JSX 允许在 JavaScript 中写 JSX；TSX 允许在 TypeScript 中写 JSX，并额外进行类型检查。

### 2. 为什么 useState(null) 经常需要显式类型？

因为仅凭 null 无法推断后续对象形状，需要写成 User | null 等联合类型。

### 3. ReactNode 解决什么问题？

它描述 React 可以渲染的 children 范围，不仅是字符串或单个元素。

### 4. TypeScript 能保证组件收到的 API 数据正确吗？

不能。组件外部的数据仍需要运行时校验。

## 十、自测与答案

### 题目

1. 如何为一个带 label、disabled 和点击回调的按钮定义 Props？
2. 为什么 user 状态常写成 User | null？
3. children 为什么不应该默认写成 string？
4. 为什么组件 Props 不建议直接复用数据库完整模型？

<details>
<summary>查看答案</summary>

1. 定义 label: string、disabled?: boolean、onClick: () => void。
2. 初始阶段可能没有用户，加载完成后才有 User。
3. children 可能是元素、文本、数组、null 等可渲染内容。
4. 组件只需要部分字段，直接复用会扩大耦合并暴露不必要字段。

</details>
