# 自定义 Hooks 与异步 UI

> 优先级：⭐

## 一、是什么

自定义 Hook 是以 use 开头、组合 React Hooks 以复用状态逻辑的函数。异步 UI 是对请求进行中、成功、空结果和失败状态的明确表达。

## 二、为什么需要

多个组件可能需要相同的状态逻辑，例如：

- 请求和取消
- 表单输入
- 防抖搜索
- 分页
- 键盘快捷键

把逻辑提取成 Hook，可以避免复制，但不会自动共享 State；每次调用 Hook 通常拥有自己的状态。

## 三、核心用法

### 自定义 Hook

~~~tsx
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = () => setValue((current) => !current)

  return { value, toggle }
}
~~~

### 请求状态

~~~tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
~~~

### 使用 Hook

~~~tsx
const { value: open, toggle } = useToggle()
~~~

## 四、核心原理

Hook 依赖调用顺序来对应内部 State。规则：

- 只在组件顶层调用 Hook。
- 只在 React 组件或自定义 Hook 中调用 Hook。
- 不放进 if、循环、嵌套函数中。

自定义 Hook 共享的是逻辑，不是默认共享同一份状态。

## 五、常见场景

- useToggle、useDebouncedValue。
- useAsync、useSearch。
- useLocalStorage。
- useKeyboardShortcut。
- 表单和分页逻辑。

## 六、踩坑点

1. Hook 名称必须以 use 开头。
2. 不能在条件分支中调用 Hook。
3. 不要把所有代码都抽成 Hook。
4. Hook 返回值应表达清晰的状态和动作。
5. 异步请求要处理取消、竞态和错误。
6. Hook 内部的依赖数组仍然必须正确。

## 七、项目中的实际使用

一个可靠的搜索 Hook 至少需要：

~~~text
输入 keyword
→ loading
→ 发起请求
→ 只接受最新结果
→ success / empty / error
→ 组件卸载或新请求时取消旧请求
~~~

Hook 负责状态逻辑，组件负责 UI 展示；不要让 Hook 返回一大串难以理解的内部细节。

## 八、一句话总结

自定义 Hook 复用的是状态逻辑；高质量异步 Hook 必须明确状态、错误、取消和竞态边界。

## 九、核心问答

### 1. 自定义 Hook 会自动共享状态吗？

不会。每次调用通常有独立 State；要共享状态需要提升、Context 或其他状态方案。

### 2. 为什么 Hook 不能放在 if 中？

React 依赖稳定的调用顺序，把每次调用对应到同一个内部状态。

### 3. 一个异步 Hook 至少应该返回什么？

至少要能表达 loading、success、error，必要时还要表达 idle、empty、取消和重试。

### 4. 什么时候不应该创建自定义 Hook？

逻辑只使用一次、没有独立概念或抽取后反而降低可读性时。

## 十、自测与答案

### 题目

1. 自定义 Hook 复用的是什么？
2. 为什么不能在循环中调用 useState？
3. 两个组件分别调用同一个 useToggle，会共享 value 吗？
4. 搜索 Hook 如何避免旧请求覆盖新结果？

<details>
<summary>查看答案</summary>

1. 复用状态逻辑和副作用组织方式。
2. 会破坏 Hook 调用顺序和内部状态对应关系。
3. 不会，默认各自拥有独立状态。
4. 取消旧请求或给请求编号，只接受最新请求的结果。

</details>
