# React 核心笔记

这是一份面向 TypeScript、Next.js 和 AI 全栈开发的 React 学习笔记。

当前阶段只整理 React 的 UI 和组件模型，不混入 Next.js 路由、Server Components、数据库和部署。

## 一、核心主干

~~~text
JSX 与组件
    ↓
Props 与单向数据流
    ↓
State 与事件
    ↓
条件渲染、列表、表单
    ↓
状态提升、Context、Reducer
    ↓
Effect 与 Ref
    ↓
自定义 Hooks 与异步 UI
    ↓
React + TypeScript
    ↓
项目最小闭环
~~~

## 二、总目录

1. [组件心智模型与学习路线](00-组件心智模型与学习路线.md)
2. [JSX 与组件](01-JSX与组件.md)
3. [Props 与数据流](02-Props与数据流.md)
4. [State 与事件](03-State与事件.md)
5. [条件渲染、列表、Key 与表单](04-渲染列表表单.md)
6. [状态提升、Context 与 Reducer](05-状态提升Context与Reducer.md)
7. [Effect 与 Ref](06-Effect与Ref.md)
8. [自定义 Hooks 与异步 UI](07-自定义Hooks与异步UI.md)
9. [React + TypeScript（项目桥接）](08-React与TypeScript.md)
10. [项目闭环](09-项目闭环.md)
11. [跨章节综合问答](10-跨章节综合问答.md)

## 三、推荐学习顺序

### 第一轮：组件和交互

~~~text
01 JSX 与组件
→ 02 Props 与数据流
→ 03 State 与事件
→ 04 渲染列表表单
~~~

目标：能写出一个具有列表、表单、交互和局部状态的小页面。

### 第二轮：复杂状态与外部系统

~~~text
05 状态提升、Context、Reducer
→ 06 Effect 与 Ref
→ 07 自定义 Hooks 与异步 UI
~~~

目标：能判断状态放在哪里，能正确处理请求、订阅、计时器和 DOM。

### 第三轮：TypeScript 项目化

~~~text
08 React + TypeScript
→ 09 项目闭环
→ 10 跨章节综合问答
~~~

目标：使用 TypeScript 完成一个可维护的 React 页面，再进入 Next.js。这里不重复 TypeScript 类型系统，只整理 React 项目中的类型边界。

## 四、优先级说明

- ⭐ 必须掌握：组件、Props、State、事件、列表 Key、表单、状态提升、Effect 基本边界、异步状态。
- △ 理解即可：Context、Reducer、Ref 的底层机制和性能细节。
- ○ 知道存在：复杂状态库、渲染器实现、并发调度内部细节。

## 五、资料来源

- 主资料：[React 中文官方文档](https://zh-hans.react.dev/learn)
- React 类型补充：[React TypeScript Cheatsheet](https://github.com/typescript-cheatsheets/react)
- React 官方英文文档：[React Learn](https://react.dev/learn)

React 官方 Learn 当前主线覆盖组件、JSX、条件渲染、列表、事件、State 和组件间共享数据；本笔记按这些依赖重新压缩，并补充 TypeScript 和项目边界。[React 官方 Learn](https://zh-hans.react.dev/learn)

## 六、完成标准

完成后应该能够：

- 用组件拆分页面。
- 用 Props 传递数据和事件。
- 用 State 驱动交互。
- 正确渲染条件和列表。
- 为列表使用稳定 Key。
- 写受控表单。
- 判断状态应该放在哪里。
- 区分 Effect、事件处理器和普通计算。
- 处理 loading、error、empty 和 success。
- 使用 TypeScript 描述 Props、State、事件和自定义 Hook。
