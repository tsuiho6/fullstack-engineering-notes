# JSX 与组件

> 优先级：⭐

## 一、是什么

JSX 是在 JavaScript 中描述 UI 的语法。组件通常是首字母大写的函数，返回 JSX。

## 二、为什么需要

JSX 把结构、数据和交互放在同一个组件表达式中，便于让 UI 结构和逻辑一起演进。

## 三、核心用法

### 组件

~~~tsx
function Greeting() {
  return <h1>你好</h1>
}

export default function Page() {
  return (
    <main>
      <Greeting />
    </main>
  )
}
~~~

组件输入是 Props，输出是 JSX。

### JSX 中使用 JavaScript

~~~tsx
const user = { name: 'Xuhao', imageUrl: '/avatar.png' }

function Profile() {
  return (
    <article>
      <h1>{user.name}</h1>
      <img src={user.imageUrl} alt={user.name} />
    </article>
  )
}
~~~

### 样式和属性

~~~tsx
<div className="card">
  <img src={imageUrl} alt={title} />
</div>
~~~

JSX 属性使用 className；动态值使用大括号。

## 四、核心原理

JSX 不是 HTML 字符串，而是 JavaScript 中的一种表达语法。组件返回 JSX，React 再根据组件树更新界面。

JSX 的关键规则：

- 标签必须闭合。
- 组件必须返回一个根节点或 Fragment。
- HTML 标签使用小写。
- 自定义组件使用大写。
- 大括号内只能放表达式，不能直接放 if 语句。

## 五、常见场景

- 页面结构。
- 可复用按钮、卡片、列表项。
- 动态文本、属性和样式。
- 条件和列表渲染。

## 六、踩坑点

1. onClick 传函数，不要写成立即调用。
2. JSX 中使用 className，不是 class。
3. 属性名通常使用驼峰写法。
4. 组件名首字母小写会被当作原生 HTML 标签。
5. JSX 中不能直接写语句型 if。
6. 不要在 JSX 中堆积复杂计算，把逻辑提前放到变量或函数中。

## 七、项目中的实际使用

把组件控制在清晰的输入输出边界：

~~~tsx
type BadgeProps = {
  label: string
  tone: 'info' | 'success' | 'error'
}

function Badge({ label, tone }: BadgeProps) {
  return <span className={'badge badge-' + tone}>{label}</span>
}
~~~

输入：label 和 tone；输出：带语义样式的标签。

## 八、一句话总结

JSX 是 UI 表达式，组件是可组合的函数；先明确输入输出，再决定是否拆成组件。

## 九、核心问答

### 1. JSX 和 HTML 的主要区别是什么？

JSX 是 JavaScript 表达式语法，属性和标签规则更严格，最终由工具转换成 React 可处理的结构。

### 2. 为什么组件名要大写？

React 用大小写区分自定义组件和原生 DOM 标签。

### 3. 为什么 onClick={handleClick} 不能写成 onClick={handleClick()}？

前者传递函数，点击时执行；后者在渲染期间立即执行，并把返回值作为处理器。

### 4. 复杂 JSX 逻辑应该怎么处理？

把条件、转换和计算提前放到变量或辅助函数中，让 JSX 保持表达结构。

## 十、自测与答案

### 题目

1. JSX 中如何显示变量？
2. 如何让组件接收 label 和 tone？
3. 为什么 div 不能直接包裹多个同级返回值？
4. onClick={handleClick} 和 onClick={handleClick()} 的区别是什么？

<details>
<summary>查看答案</summary>

1. 使用大括号，例如 {user.name}。
2. 定义 Props 类型并在组件参数中解构。
3. 组件返回值需要一个根节点或 Fragment。
4. 前者传函数，后者在渲染时立即执行。

</details>
