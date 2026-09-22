# 模块与 tsconfig

> 优先级：⭐

## 一、是什么

模块负责组织运行时代码和类型；tsconfig.json 负责告诉 TypeScript 如何检查项目、处理文件和配合构建工具。

## 二、为什么需要

项目变大后，类型是否严格、模块如何解析、哪些文件参与检查都会影响：

- 能否正确导入代码
- 能否发现隐式 any
- 能否安全处理 null
- 编辑器提示是否可靠
- 构建和开发环境是否一致

## 三、核心用法

### 命名导出与导入

~~~ts
// user.ts
export type User = {
  id: string
}

export function getUser(): User {
  return { id: 'u1' }
}
~~~

~~~ts
// page.ts
import { getUser, type User } from './user'
~~~

只在类型位置使用时，优先使用 type-only import，减少运行时依赖歧义。

### tsconfig 核心配置

~~~json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022"
  },
  "include": ["src"]
}
~~~

不同框架会提供自己的推荐配置。Next.js 项目优先使用脚手架生成的配置，在理解含义后再做最小修改。

### 重点选项

- strict：开启严格类型检查总开关。
- noImplicitAny：禁止无法推断时偷偷变成 any。
- strictNullChecks：把 null 和 undefined 当成独立类型。
- noEmit：只检查类型，不让 tsc 负责输出构建产物。
- target：生成代码目标，通常由框架配置。
- moduleResolution：模块解析方式，现代构建工具通常使用 Bundler。
- paths：路径别名，必须和构建工具保持一致。

## 四、核心原理

TypeScript 的模块系统有两个层面：

~~~text
运行时模块：真正导入函数、对象和变量
类型模块：只在编译期导入类型
~~~

type-only import 能明确告诉工具“这个导入不需要运行时值”。

tsconfig 不是单纯的语法配置，它决定了编译器如何理解项目边界和模块关系。框架构建工具还可能负责转译 JSX、打包和输出 JavaScript。

## 五、常见场景

- 多文件项目。
- React/Next.js 工程。
- 共享类型和 API 模型。
- 严格模式迁移。
- 编辑器和 CI 类型检查。

## 六、踩坑点

1. tsconfig 中写了选项，不代表框架构建工具一定按相同方式处理。
2. module、moduleResolution 和路径别名必须与运行时保持一致。
3. noEmit 不代表完全不需要构建，只表示 tsc 不输出文件。
4. type-only import 不能拿来当运行时值使用。
5. 为了消除报错随意关闭 strict，会把问题推迟到运行时。
6. 只检查 src 不代表测试、脚本和配置文件一定被检查。

## 七、项目中的实际使用

把类型检查放入开发和 CI：

~~~json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
~~~

项目提交前至少执行：

~~~text
格式检查
→ 类型检查
→ 测试
→ 构建
~~~

## 八、一句话总结

模块建立代码依赖，tsconfig 建立类型检查边界；严格配置应该配合项目工具链，而不是机械复制配置。

## 九、核心问答

### 1. 为什么需要 type-only import？

它明确表示这是编译期类型依赖，避免把类型误当成运行时值，也有助于工具进行模块分析。

### 2. strict 和 noImplicitAny 的关系是什么？

strict 是严格检查总开关，noImplicitAny 是其中一个具体约束。

### 3. noEmit 会不会让项目不能运行？

不会。它只禁止 tsc 输出文件，框架自己的构建工具仍可以负责编译和打包。

### 4. 为什么不要直接复制网上的 tsconfig？

不同运行时、构建工具和框架的模块解析方式不同，复制可能导致编辑器、构建和运行时不一致。

## 十、自测与答案

### 题目

1. 什么时候使用 type-only import？
2. strict 主要解决什么问题？
3. noEmit 的作用是什么？
4. 为什么 paths 必须和构建工具保持一致？

<details>
<summary>查看答案</summary>

1. 导入项只用于类型、不需要运行时值时。
2. 开启更严格的类型检查，减少隐式 any、空值和其他不安全行为。
3. 只进行类型检查，不让 tsc 输出构建文件。
4. TypeScript 能解析不代表运行时也能解析，二者必须使用一致的别名规则。

</details>
