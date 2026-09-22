# Props 与数据流

> 优先级：⭐

## 一、是什么

Props 是父组件传给子组件的只读输入。React 常见的数据流是父组件向下传值，子组件通过回调向上发出事件。

## 二、为什么需要

Props 让组件可配置、可复用，也让数据来源明确。没有清晰 Props，组件会依赖隐式全局变量或互相修改状态。

## 三、核心用法

~~~tsx
type NoteCardProps = {
  title: string
  selected: boolean
  onSelect: () => void
}

function NoteCard({ title, selected, onSelect }: NoteCardProps) {
  return (
    <button aria-pressed={selected} onClick={onSelect}>
      {title}
    </button>
  )
}
~~~

父组件：

~~~tsx
<NoteCard
  title="Promise"
  selected={selectedId === 'promise'}
  onSelect={() => setSelectedId('promise')}
/>
~~~

## 四、核心原理

Props 是当前渲染得到的输入快照，子组件不应该直接修改 Props。需要改变数据时，由拥有状态的组件执行更新，再把新值传下来。

### 回调是事件通道

子组件并没有“修改父组件状态”的特殊能力。父组件把函数作为 Props 传下来，子组件调用它，父组件决定如何更新状态。

## 五、常见场景

- 可复用组件。
- 列表项操作。
- 表单字段。
- 父子组件通信。
- 受控组件。

## 六、踩坑点

1. 不要直接修改 Props 对象或数组。
2. 不要把整个大对象无必要地传给所有子组件。
3. 回调命名表达事件，例如 onSelect、onSubmit，不要把内部实现暴露出去。
4. Props 过多通常表示职责过重或需要重新组织组件。
5. 对象和函数每次渲染可能产生新引用，不要先追求记忆化。

## 七、项目中的实际使用

推荐把“数据”和“动作”一起设计：

~~~tsx
type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}
~~~

子组件只负责展示和发出事件；列表容器负责状态更新和业务规则。

## 八、一句话总结

Props 是组件的只读输入，回调是子组件向上表达事件的通道，状态只由拥有它的组件负责更新。

## 九、核心问答

### 1. 子组件能否直接修改 Props？

不应该。Props 是父组件提供的只读输入，需要通过回调通知父组件更新。

### 2. 为什么回调 Props 是 React 常见通信方式？

它保持数据向下流动，同时让子组件只表达事件，不依赖父组件内部实现。

### 3. Props 和 State 的区别是什么？

Props 来自外部、由父组件控制；State 属于组件或其所在的状态拥有者，由组件通过 setter 或 dispatch 更新。

### 4. Props 过多说明什么？

可能说明组件职责太多、数据边界不清，或需要状态提升、Context 或拆分子组件。

## 十、自测与答案

### 题目

1. 子组件如何通知父组件删除一条数据？
2. 为什么列表项不应该直接修改 todo？
3. Props 为什么被称为只读输入？
4. 如何设计一个复用性更好的按钮组件？

<details>
<summary>查看答案</summary>

1. 父组件传入 onDelete(id)，子组件调用它。
2. 数据由父组件或状态拥有者管理，直接修改会破坏单向数据流。
3. 它描述当前渲染的输入，子组件不拥有修改权。
4. 只暴露必要的语义 Props 和事件，不绑定具体业务实现。

</details>
