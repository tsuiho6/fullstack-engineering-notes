# State 与事件

> 优先级：⭐

## 一、是什么

State 是组件需要记住、并且变化后会影响 UI 的数据。事件处理器是响应用户动作并请求状态变化的函数。

## 二、为什么需要

普通局部变量变化不会触发 React 重新渲染，也不会跨渲染保留。State 提供了“记住数据并更新界面”的机制。

## 三、核心用法

~~~tsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount((current) => current + 1)
  }

  return <button onClick={handleClick}>{count}</button>
}
~~~

### 函数式更新

当新值依赖旧值时：

~~~tsx
setCount((current) => current + 1)
~~~

### 对象状态

~~~tsx
setForm((form) => ({
  ...form,
  title: nextTitle,
}))
~~~

### 事件传递

~~~tsx
<button onClick={handleClick}>保存</button>
~~~

传函数，不要在渲染时调用它。

## 四、核心原理

### State 是快照

一次渲染中的 state 值不会因为调用 setter 而立即改变。setter 请求下一次渲染。

### 更新会批处理

React 可能把同一事件中的多次更新合并处理。因此依赖旧值时使用函数式更新更可靠。

### State 位置决定共享范围

每个组件实例拥有自己的 State。多个组件需要同步时，状态应该提升到它们最近的共同父组件。

## 五、常见场景

- 计数、开关和选中项。
- 表单输入。
- 展开/收起。
- 对话框显示。
- 请求状态。

## 六、踩坑点

1. 不要把 State 当作普通变量立即读取新值。
2. 依赖旧值时不要写成 setCount(count + 1) 的重复调用。
3. 不要把可以从 Props 或现有 State 计算出的值重复存成 State。
4. 不要直接修改对象和数组 State。
5. 事件处理器和 Effect 的职责不同。

## 七、项目中的实际使用

把状态分成：

~~~text
原始状态：用户真正改变的数据
派生数据：由原始状态计算得到，不单独存
UI 状态：loading、error、open、selected 等
~~~

例如搜索页面只存 keyword 和结果，过滤后的列表可以在渲染时计算，不需要再存一个 filteredResults。

## 八、一句话总结

State 是跨渲染保留的 UI 数据快照；事件通过 setter 或 dispatch 请求下一次渲染。

## 九、核心问答

### 1. 为什么普通局部变量不能代替 State？

重新渲染时局部变量会重新初始化，修改它也不会通知 React 更新界面。

### 2. 什么时候使用函数式更新？

新状态依赖旧状态时，尤其是连续更新、异步回调和批处理场景。

### 3. 为什么不应该存派生 State？

它会产生多个真相来源，容易与原始数据不同步。

### 4. State 为什么要提升？

需要共享的组件必须读取同一个状态来源，才能保持一致。

## 十、自测与答案

### 题目

1. 调用 setCount 后当前函数中的 count 会立即改变吗？
2. 连续增加两次时为什么推荐函数式更新？
3. 搜索结果过滤列表是否应该永远存成 State？
4. 两个兄弟组件需要共享选中项时，State 应该放在哪里？

<details>
<summary>查看答案</summary>

1. 不会，当前渲染仍然使用旧快照。
2. 它会基于最新排队中的值逐次计算，避免捕获旧快照。
3. 不应该，若能由原始数据和 keyword 计算，就在渲染时派生。
4. 放到它们最近的共同父组件。

</details>
