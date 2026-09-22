# React + TypeScript

> 优先级：⭐
> 资料补充：[React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react)

## 一、是什么

React + TypeScript 的重点是为组件边界、数据流、事件和异步状态建立类型，而不是给每一行代码添加注解。

## 二、为什么需要

类型可以提前发现：

- Props 缺失或传错
- 事件对象使用错误
- State 分支不完整
- Hook 返回值被误用
- API 数据在组件间传递时失去约束

## 三、核心用法

### Props

~~~tsx
type NoteCardProps = {
  note: Note
  selected: boolean
  onSelect: (id: string) => void
}

function NoteCard({
  note,
  selected,
  onSelect,
}: NoteCardProps) {
  return (
    <button
      aria-pressed={selected}
      onClick={() => onSelect(note.id)}
    >
      {note.title}
    </button>
  )
}
~~~

### State

~~~tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState<User | null>(null)
~~~

### 事件

~~~tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  setKeyword(event.target.value)
}
~~~

### children

~~~tsx
type PanelProps = {
  children: React.ReactNode
}
~~~

### Hook 返回值

~~~tsx
type UseToggleResult = {
  value: boolean
  toggle: () => void
}
~~~

## 四、核心原理

Props 是函数参数，State 是组件内部状态，事件处理器是函数。React 类型设计本质上是在给这些数据流边界命名。

优先级：

~~~text
领域类型
→ 组件 Props
→ 事件类型
→ 状态联合
→ Hook 输入输出
~~~

## 五、常见场景

- 表单和输入事件。
- 列表项操作。
- Context Provider。
- Reducer Action。
- 自定义 Hook。

## 六、踩坑点

1. 不要把 Props 写成 any。
2. 不要滥用 as。
3. useState(null) 通常需要 User | null。
4. children 不一定是 string。
5. 事件类型应根据实际元素选择。
6. 不要为了统一而到处使用 React.FC；普通函数加 Props 类型通常更直接。

## 七、项目中的实际使用

为列表页面定义三层类型：

~~~tsx
type Note = {
  id: string
  title: string
  content: string
}

type NoteListProps = {
  notes: Note[]
  onDelete: (id: string) => void
}

type NoteRequestState =
  | { status: 'loading' }
  | { status: 'success'; data: Note[] }
  | { status: 'error'; message: string }
~~~

API 类型、领域类型和组件 Props 不一定要完全相同，应按边界需要设计。

## 八、一句话总结

React + TypeScript 的核心是给 Props、State、事件和 Hook 建立清晰契约，而不是把所有值都写成复杂类型。

## 九、核心问答

### 1. 为什么组件 Props 不直接写成 any？

any 会关闭调用处检查，失去组件边界的主要价值。

### 2. 为什么 State 常需要联合类型？

因为加载、成功、失败和空数据是不同状态，联合类型可以表达互斥分支。

### 3. 为什么事件类型应该具体？

不同元素的 target 和事件字段不同，具体类型能提供正确提示并避免错误访问。

### 4. React.FC 是否必须使用？

不必须。普通函数参数加 Props 类型更直观，是否使用应遵循团队规范。

## 十、自测与答案

### 题目

1. 如何为 onSelect 事件定义类型？
2. 为什么 user 状态要写 User | null？
3. children 为什么适合使用 ReactNode？
4. 为什么 API 类型和组件 Props 可以不同？

<details>
<summary>查看答案</summary>

1. 例如 onSelect: (id: string) => void。
2. 初始状态可能没有用户，之后才得到 User。
3. ReactNode 覆盖文本、元素、数组和空值等可渲染内容。
4. API 返回完整数据，组件可能只需要部分字段，边界职责不同。

</details>
