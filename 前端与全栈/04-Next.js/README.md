# Next.js 核心笔记

这是一份面向 TypeScript、React 和 AI 全栈开发的 Next.js 学习笔记。

React 负责 UI 和组件模型；Next.js 在此之上负责路由、服务端渲染、数据访问、缓存、写入、认证和部署。本目录只整理 App Router 与全栈应用主线，不把 Pages Router 当作当前主线。

## 一、核心主干

~~~text
React 组件基础
    ↓
App Router 与文件约定
    ↓
page、layout、动态路由、导航
    ↓
Server Components / Client Components
    ↓
数据获取、渲染模式、缓存与重新验证
    ↓
loading、error、not-found、Suspense
    ↓
Route Handlers 与 Server Actions
    ↓
表单、认证、授权、环境变量
    ↓
PostgreSQL 与数据访问层
    ↓
部署、观测、生产边界
    ↓
AI 流式响应
    ↓
可交付的全栈项目闭环
~~~

## 二、总目录

### Next.js 核心

1. [Next.js 心智模型与学习路线](00-心智模型与学习路线.md)
2. [App Router 与 app 目录](01-App-Router与app目录.md)
3. [page、layout 与动态路由](02-page-layout与动态路由.md)
4. [Server Components 与 Client Components](03-Server与Client组件.md)
5. [数据获取、缓存与重新验证](04-数据获取缓存与重新验证.md)
6. [loading、error、not-found 与流式渲染](05-加载错误404与流式渲染.md)
7. [Route Handlers 与 Server Actions](06-Route-Handlers与Server-Actions.md)

### 全栈与 AI 扩展

8. [表单、认证、授权与环境变量](07-表单认证授权与环境变量.md)
9. [PostgreSQL 与数据访问层](08-PostgreSQL与数据访问层.md)
10. [部署与生产环境](09-部署与生产环境.md)
11. [AI 流式响应](10-AI流式响应.md)
12. [项目最小闭环](11-项目最小闭环.md)
13. [跨章节综合问答](12-跨章节综合问答.md)
14. [当前版本缓存 API 补充](补充-当前版本缓存API.md)
## 三、推荐学习顺序

### 第一轮：Next.js 框架核心

~~~text
00 → 01 → 02 → 03 → 04 → 05 → 06
~~~

目标：能创建 App Router 项目，理解 URL、页面、布局、Server/Client 边界、数据读取和错误反馈。

### 第二轮：全栈应用能力

~~~text
07 → 08 → 04 的缓存补充
~~~

目标：能完成表单、Server Action、数据库读写、认证授权和缓存重新验证。

### 第三轮：交付与 AI 应用

~~~text
09 → 10 → 11 → 12
~~~

目标：能部署一个真实项目，接入 AI 流式响应，并通过综合问答检查是否真正掌握。
## 四、优先级说明

### Next.js 核心

- ⭐ 必须掌握：App Router、page/layout、动态路由、Server/Client 边界、数据获取、loading/error/not-found、Route Handlers、Server Actions。
- △ 理解即可：缓存内部实现、渲染调度、Route Groups、Suspense 的细粒度优化。
- ○ 知道存在：拦截路由、自定义服务器、底层 RSC 协议和复杂并行路由。

### 全栈与 AI 扩展

- ⭐ 第二阶段必须掌握：表单、环境变量、PostgreSQL 基础、认证授权和部署运行时。
- △ 项目需要时深入：连接池、复杂缓存、观测、流式协议和 AI SDK 细节。
- ○ 知道存在：多租户、复杂代理规则、自定义运行时和高级部署架构。
## 五、资料来源

- 主资料：[Next.js 官方文档](https://nextjs.org/docs)
- 官方课程：[Next.js Learn](https://nextjs.org/learn)
- App Router 课程：[Next.js Dashboard Course](https://nextjs.org/learn/dashboard-app)
- AI 流式补充：[AI SDK 官方文档](https://ai-sdk.dev/docs)

官方文档将 Next.js 定位为构建全栈 Web 应用的 React framework；官方课程通过一个包含路由、PostgreSQL、数据获取、流式、Server Actions、错误处理和认证的完整项目来组织学习。[Next.js Docs](https://nextjs.org/docs) [Next.js Learn](https://nextjs.org/learn)

## 六、重要版本提醒

Next.js 的 App Router、缓存和 Server Functions 仍在持续演进。本文按当前官方文档的方向整理，但涉及缓存、动态 API、params 类型和认证库时，应以项目实际使用的 Next.js 版本为准。

当前学习阶段不要把所有新 API 背下来。先掌握稳定判断：

1. 这段代码运行在服务器还是浏览器？
2. 这个页面数据是读、写，还是需要重新验证？
3. 这个状态属于 URL、服务器数据，还是客户端交互？
4. 这个请求是否携带了秘密、身份和权限？
5. 当前部署环境是否真的支持 Next.js 运行时？

## 七、完成标准

完成后应该能够：

- 从零创建 App Router 项目并解释 app 目录。
- 写出共享 layout、页面、动态路由和导航。
- 判断组件应该放在 Server 还是 Client。
- 在 Server Component 中读取数据，在 Client Component 中处理交互。
- 实现 loading、error 和 not-found。
- 区分 Route Handler 与 Server Action 的使用场景。
- 完成表单校验、数据库写入和缓存重新验证。
- 不把私密环境变量暴露到浏览器。
- 理解认证和授权不是一回事，并在数据访问与写操作处检查权限。
- 部署一个需要服务器运行时的 Next.js 应用。
- 完成一个 AI 流式聊天或流式摘要页面。
