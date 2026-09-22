# TypeScript 核心笔记

这是一份面向 React、Next.js 和 AI 全栈开发的 TypeScript 学习笔记。

目标不是记住所有类型体操，而是建立一条能直接服务项目的主干：

~~~text
JavaScript 运行时
        ↓
类型推断与常见类型
        ↓
未知输入与类型缩小
        ↓
函数、对象和泛型
        ↓
模块与 tsconfig
        ↓
React/TSX 类型桥接
        ↓
类型安全的 API 与项目闭环
~~~

## 一、优先级

- ⭐ 必须掌握：高频使用、后续依赖、项目必用。
- △ 理解即可：知道机制和判断方式，暂时不要求背写法。
- ○ 知道存在：遇到问题再查，不进入主干复习。

## 二、总目录

1. [学习路线与类型心智模型](00-学习路线与类型心智模型.md)
2. [基础与常见类型](01-基础与常见类型.md)
3. [类型缩小与未知输入](02-类型缩小与未知输入.md)
4. [函数与对象类型](03-函数与对象类型.md)
5. [泛型与类型操作](04-泛型与类型操作.md)
6. [模块与 tsconfig](05-模块与tsconfig.md)
7. [TSX 与 React 类型桥接（进入 React 前的过渡篇）](06-TSX与React类型桥接.md)
8. [项目闭环：类型安全的 API 与表单](07-项目闭环.md)
9. [跨章节综合问答](08-跨章节综合问答.md)

## 三、推荐学习顺序

### 第一轮：能读懂并写出项目代码

~~~text
00 类型心智模型
→ 01 基础与常见类型
→ 02 类型缩小与未知输入
→ 03 函数与对象类型
~~~

目标：能够为 API 数据、函数参数、返回值、组件 Props 和状态建立基本类型。

### 第二轮：能组织和复用类型

~~~text
04 泛型与类型操作
→ 05 模块与 tsconfig
~~~

目标：能够设计可复用的 API 类型、工具函数和稳定的项目类型边界。

### 第三轮：进入 React（过渡篇）

~~~text
06 TSX 与 React 类型桥接
→ React 组件、Hooks、表单和异步 UI
~~~

目标：能使用 TypeScript 写 React，而不是只会把 JavaScript 文件改成 tsx。React 的组件、Hooks 和 UI 状态仍以 React 笔记为主，这一篇只负责类型桥接。

## 四、学习边界

本阶段暂时不把以下内容放进主干：

- 复杂条件类型和类型体操
- 声明合并和命名空间
- 编写第三方库声明文件
- 装饰器的历史用法
- 编译器实现细节
- 所有 TSConfig 选项的逐项背诵

这些内容不是没有价值，而是当前对 React/Next.js 项目收益较低。

## 五、资料来源

- 主资料：[TypeScript 中文 Handbook](https://www.tslang.com.cn/zh/docs/handbook/intro.html)
- 官方对应资料：[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- 常见类型：[Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- 类型缩小：[Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- 函数：[More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- 泛型：[Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- 配置：[TSConfig Reference](https://www.typescriptlang.org/tsconfig/)

使用原则：

- 中文 Handbook 负责理解主线。
- 官方文档负责核对版本、边界行为和配置细节。
- 项目中遇到的类型问题，优先回到“运行时数据是什么”和“边界在哪里”。

## 六、完成标准

完成这组笔记后，应该能够：

- 解释 TypeScript 类型检查发生在什么时候。
- 区分 any、unknown、never 和类型断言。
- 用联合类型和类型缩小描述真实状态。
- 给 API、函数、对象、组件 Props 建立合理类型。
- 使用泛型而不是复制多份相似类型。
- 看懂严格模式下常见报错。
- 知道哪些问题必须在运行时校验，不能只相信 TypeScript。
