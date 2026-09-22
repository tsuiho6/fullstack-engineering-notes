# App Router 与 app 目录

> 优先级：⭐ 必须掌握：文件路由、特殊文件和 app 目录的基本约定。

## 一、是什么

App Router 是 Next.js 以 app 目录为中心的路由系统。目录代表路由段，特殊文件决定页面、布局、加载状态、错误边界和接口。

## 二、为什么需要

它把 URL、组件树、布局复用和数据边界放进同一个结构中，避免路由配置与页面组件分散维护。

## 三、核心用法

最小结构：

~~~text
app/
├─ layout.tsx          根布局，通常只创建一次
├─ page.tsx            /
├─ notes/
│  ├─ page.tsx         /notes
│  ├─ loading.tsx      /notes 的加载 UI
│  ├─ error.tsx        /notes 的错误边界
│  └─ [slug]/
│     ├─ page.tsx      /notes/:slug
│     └─ not-found.tsx 不存在时的 UI
├─ api/
│  └─ notes/
│     └─ route.ts      /api/notes
└─ globals.css
~~~

页面必须默认导出组件：

~~~tsx
export default function NotesPage() {
  return <main>学习笔记</main>;
}
~~~

根布局必须返回 html 和 body：

~~~tsx
import type { ReactNode } from 'react';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
~~~

## 四、核心原理

同一路径上的 layout 会包裹下层 page 和 layout。导航到子路由时，共享布局通常不会被重新替换，因此可以保留导航栏、侧边栏和部分客户端状态。

只有包含 page 或其他公开入口的路由段才会成为用户可访问的页面。普通文件夹可以用来组织代码，路由组可以在不改变 URL 的情况下分组。

## 五、常见场景

- 根 layout：全局字体、主题、全局 Provider、基础元数据。
- 局部 layout：仪表盘侧边栏、登录区域布局。
- private folder：把组件放进 app 中但不创建 URL。
- route group：组织代码或应用不同布局，但不把分组名放进 URL。

## 六、踩坑点

- 在同一个路由段同时放 page.tsx 和 route.ts，产生冲突。
- 误以为 layout 每次导航都会重新执行并重新验证全部身份状态。
- 将只有组件用途的文件夹误认为会自动成为路由。
- 在根 layout 中放过多客户端逻辑，导致整个应用客户端化。
- 忘记根 layout 的 html 和 body。

## 七、项目中的实际使用

学习资料库可以这样组织：

~~~text
app/
├─ layout.tsx
├─ page.tsx
├─ notes/
│  ├─ page.tsx
│  └─ [slug]/page.tsx
├─ dashboard/
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ notes/page.tsx
├─ ui/
└─ lib/
~~~

app/ui 放可复用 UI，app/lib 放数据访问和业务逻辑，但不要把数据库客户端导入 Client Component。

## 八、一句话总结

App Router 用文件结构描述 URL 和组件树，用特殊文件描述页面生命周期。

## 九、核心问答

### 1. page.tsx 和 layout.tsx 的职责区别是什么？

page 定义当前路由唯一的页面内容；layout 包裹当前段及其子路由，并负责共享 UI。

### 2. app 目录下任意文件夹都会生成路由吗？

不会，通常需要 page 等公开入口；普通文件夹可用于代码组织。

### 3. 为什么要有局部 layout？

让某一组页面共享导航、侧边栏和布局，而不污染全局布局。

### 4. route.ts 和 page.tsx 能放在同一级吗？

不能，它们会争夺同一个路由段；通常把接口放到 api 子目录。

## 十、自测与答案

1. 写出 /notes、/notes/go 和 /api/notes 对应的最小目录。
2. 哪个文件最适合放仪表盘公共侧边栏？
3. 如果一个页面只需要按钮交互，是否必须把根 layout 标记为 Client？
4. 为什么 app/lib 中的数据库访问模块应该保持服务器边界？

<details>
<summary>参考答案</summary>

1. app/notes/page.tsx、app/notes/[slug]/page.tsx、app/api/notes/route.ts。
2. app/dashboard/layout.tsx。
3. 不需要，只把按钮或交互区域拆成 Client Component。
4. 数据库凭证和数据库客户端不应进入浏览器包。

</details>
