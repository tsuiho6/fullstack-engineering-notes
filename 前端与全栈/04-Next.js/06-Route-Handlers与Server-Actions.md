# Route Handlers 与 Server Actions

> 优先级：⭐ 必须掌握：区分 HTTP 边界与页面内服务器命令。

## 一、是什么

Route Handler 是 app 目录下 route.ts 定义的 HTTP 请求处理器；Server Action 是标记为 use server、可从表单或客户端交互触发的服务器函数。

二者都在服务器执行，但对外暴露的调用模型不同：

| 机制 | 入口 | 适合 |
| --- | --- | --- |
| Route Handler | HTTP 方法和 URL | API、Webhook、移动端或第三方调用 |
| Server Action | 表单 action 或服务器函数调用 | 当前页面的表单提交和数据变更 |

## 二、为什么需要

页面不应该把数据库写入和第三方密钥交给浏览器。Route Handler 提供明确的 HTTP 边界；Server Action 让页面表单可以直接调用服务器写入逻辑，减少样板 API。

## 三、核心用法

Route Handler：

~~~ts
import { NextResponse } from 'next/server';

export async function GET() {
  const notes = await listNotes();
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const body = await request.json();
  const note = await createNote(body);
  return NextResponse.json(note, { status: 201 });
}
~~~

Server Action：

~~~ts
'use server';

import { updateTag } from 'next/cache';

export async function createNote(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ok: false, message: '标题不能为空' };

  await db.note.create({ data: { title } });
  updateTag('notes');
  return { ok: true };
}
~~~

在表单中使用：

~~~tsx
import { createNote } from '@/app/lib/actions';

export default function NewNoteForm() {
  return (
    <form action={createNote}>
      <input name="title" required />
      <button type="submit">保存</button>
    </form>
  );
}
~~~

## 四、核心原理

Server Action 不是自动安全的后门。它只是把函数执行位置放到服务器，参数仍然来自不可信的客户端，必须进行校验、认证、授权和错误处理。

Route Handler 使用 Web Request 和 Response API，可以读 URL、headers、cookies 和 body。它是明确的 HTTP 边界，适合需要被其他客户端调用的功能。

Server Action 更接近“命令”：

~~~text
表单提交 → 校验输入 → 验证身份 → 验证权限 → 写数据库 → 失效缓存 → 返回状态或重定向
~~~

## 五、常见场景

- Route Handler：公开 API、Webhook、AI chat endpoint、文件下载。
- Server Action：新增、编辑、删除、收藏、表单提交。
- 两者都需要：写入权限、输入校验、限流、日志和错误边界。

## 六、踩坑点

- 认为 Server Action 只有当前页面能调用，所以不需要权限检查。
- 把复杂查询和业务规则直接写在 route.ts，导致数据层无法复用。
- Route Handler 返回数据库错误原文，泄露内部结构。
- Server Action 接收 FormData 后直接信任类型。
- 写入成功后忘记重新验证缓存或刷新页面状态。
- 在同一路由段同时放 page.tsx 和 route.ts。

## 七、项目中的实际使用

学习资料库的边界建议：

~~~text
app/lib/data.ts       只负责读取和领域查询
app/lib/actions.ts    只负责当前应用的写入命令
app/api/notes/route.ts 对外提供 HTTP API
app/api/chat/route.ts  AI 流式接口
~~~

先用 Server Action 完成网页表单，再在需要被外部客户端调用时增加 Route Handler。不要为了“像后端”而给每个页面都创建 API。

## 八、一句话总结

Server Action 是页面内的服务器命令，Route Handler 是可被 HTTP 调用的服务器边界，安全校验二者都不能省。

## 九、核心问答

### 1. 表单新增笔记优先用什么？

如果只服务于当前 Next.js 页面，优先 Server Action；如果还要服务移动端、第三方或独立前端，提供 Route Handler。

### 2. Server Action 是否等于安全？

不等于。它只保证执行在服务器，输入、身份、权限和资源归属仍需检查。

### 3. 为什么 AI chat 常用 Route Handler？

它需要接收 HTTP 请求并返回持续的响应流，Route Handler 提供清晰的请求和响应边界。

### 4. 写入操作完成后还要做什么？

处理错误和返回状态，重新验证相关缓存，必要时重定向或刷新当前 UI。

## 十、自测与答案

1. 设计一个删除笔记的 Server Action，最少要检查哪些内容？
2. 为什么第三方 Webhook 不应该直接调用 Server Action？
3. Route Handler 中如何避免泄露数据库错误？
4. 什么时候一个表单值得抽成独立 API？

<details>
<summary>参考答案</summary>

1. 输入 ID 格式、当前用户身份、是否拥有该笔记、数据库删除结果、缓存失效和失败反馈。
2. Server Action 的调用模型面向应用内服务器函数，不是稳定的公共 HTTP 合约；第三方更适合调用带签名校验的 Route Handler。
3. 记录服务端日志，对客户端返回通用错误和合适状态码。
4. 需要被其他前端、移动端、第三方服务或独立部署的消费者调用时。

</details>
