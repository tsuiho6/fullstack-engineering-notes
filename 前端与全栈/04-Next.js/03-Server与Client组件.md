# Server Components 与 Client Components

> 优先级：⭐ 必须掌握：判断代码运行位置和划分 Server/Client 边界。

## 一、是什么

在 App Router 中，page 和 layout 默认是 Server Components。需要状态、事件处理器、Effect 或浏览器 API 的组件，才在文件顶部使用 use client 声明 Client Component 入口。

## 二、为什么需要

服务器更接近数据库和私密服务，可以减少发送到浏览器的 JavaScript；浏览器负责交互、状态和 DOM。二者结合，才能同时获得数据访问能力和良好的交互体验。

## 三、核心用法

Server Component 直接读取服务器数据：

~~~tsx
import { getNotes } from '@/app/lib/data';
import SearchBox from './search-box';

export default async function NotesPage() {
  const notes = await getNotes();
  return (
    <>
      <SearchBox />
      <ul>
        {notes.map((note) => <li key={note.id}>{note.title}</li>)}
      </ul>
    </>
  );
}
~~~

交互组件：

~~~tsx
'use client';

import { useState } from 'react';

export default function SearchBox() {
  const [value, setValue] = useState('');
  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="搜索笔记"
    />
  );
}
~~~

Server Component 可以渲染 Client Component，并通过 Props 传递可序列化数据：

~~~tsx
<LikeButton initialCount={note.likeCount} />
~~~

## 四、核心原理

use client 不是“这个文件只在浏览器执行”的简单开关，而是声明客户端模块图的入口。被它导入的模块会进入客户端边界，因此应尽量把它放在最小交互组件上。

Server Component 生成 RSC Payload 和 HTML；Client Component 在浏览器进行 hydration，接上事件和状态。

| 能力 | Server Component | Client Component |
| --- | --- | --- |
| 直接查询数据库 | 适合 | 不适合 |
| 访问私密 API Key | 适合 | 不适合 |
| useState、useEffect | 不可用 | 适合 |
| onClick、onChange | 不可用 | 适合 |
| window、localStorage | 不可用 | 适合 |
| 减少客户端 JS | 适合 | 会增加 |
| 使用 React Context | 不能直接使用 | 可以使用 |

传给 Client Component 的 Props 必须可序列化，因此不能把任意函数、数据库连接或复杂服务器对象直接传过去。

## 五、常见场景

- 页面初始数据和 SEO 内容：Server Component。
- 搜索框、弹窗、拖拽、主题切换：Client Component。
- 客户端 Provider：单独建立小型 Client Component，在 Server layout 中尽量深地包裹。
- 第三方交互库：用 Client Component 包一层再从服务器组件引用。

## 六、踩坑点

- 为了一个按钮把整个 layout 标记为 use client。
- 在 Client Component 中导入数据库客户端或服务器密钥。
- 把函数作为 Server 到 Client 的普通 Props 传递。
- 误以为 Client Component 只会在浏览器首次渲染，忽略初始预渲染和 hydration。
- 误以为 Server Component 能使用 React Context。

## 七、项目中的实际使用

一个笔记详情页可以这样切分：

~~~text
NotePage（Server）
├─ NoteContent（Server）
├─ RelatedNotes（Server）
└─ NoteActions（Client）
   ├─ 收藏按钮
   ├─ 复制按钮
   └─ 分享弹窗
~~~

服务端先查笔记和相关资料，客户端只接收渲染交互所需的数据。若收藏操作涉及数据库，Client Component 触发 Server Action 或请求 Route Handler，而不是直接连接数据库。

## 八、一句话总结

默认先放服务器，只有需要交互、浏览器 API 或客户端 Hook 的最小区域才跨过边界进入 Client。

## 九、核心问答

### 1. 为什么 Server Component 适合直接查数据库？

它运行在服务器，可以使用数据库连接和密钥，并避免为同一次读取额外创建浏览器到 API 的中间层。

### 2. use client 应该放在哪里？

放在需要状态、事件、Effect 或浏览器 API 的客户端入口文件顶部，而不是整个应用入口。

### 3. Server Component 能不能渲染 Client Component？

可以。常见模式就是服务器负责数据和结构，客户端组件负责局部交互。

### 4. Client Component 能不能直接渲染 Server Component？

通常通过 children 或其他插槽由服务器组件组合进去，而不是在客户端模块中直接导入服务器数据逻辑。

## 十、自测与答案

1. 一个组件需要 useState 和数据库查询，应该如何拆？
2. 为什么不能把 database client 作为 Props 传给 Client Component？
3. 一个主题 Provider 应该放在什么边界？
4. 为什么 use client 越靠近叶子节点通常越好？

<details>
<summary>参考答案</summary>

1. Server Component 查询数据库并传可序列化数据；Client Component 管理状态和交互。
2. 它不可序列化且可能包含私密连接和凭证。
3. Provider 自身是 Client Component，由 Server layout 在需要的子树附近包裹。
4. 可以减少客户端 JavaScript，并让更多页面和数据逻辑留在服务器。

</details>
