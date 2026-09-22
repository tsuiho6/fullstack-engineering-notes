# page、layout 与动态路由

> 优先级：⭐ 必须掌握：页面、布局、动态参数和导航的日常写法。

## 一、是什么

page 是某个 URL 的页面入口；layout 是包裹页面的共享 UI；动态路由用方括号目录承载运行时参数。

## 二、为什么需要

真实应用的 URL 通常来自数据，例如笔记 slug、用户 ID、商品 ID。动态路由让页面结构与数据标识保持一致，并可以复用布局和加载边界。

## 三、核心用法

静态页面：

~~~tsx
export default function NotesPage() {
  return <h1>全部笔记</h1>;
}
~~~

当前 App Router 中，动态参数按 Promise 读取：

~~~tsx
type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NotePage({ params }: PageProps) {
  const { slug } = await params;
  return <h1>笔记：{slug}</h1>;
}
~~~

查询参数适合搜索、筛选和分页：

~~~tsx
type PageProps = {
  searchParams: Promise<{
    query?: string;
    page?: string;
  }>;
};

export default async function NotesPage({ searchParams }: PageProps) {
  const { query = '', page = '1' } = await searchParams;
  return <p>关键词：{query}，页码：{page}</p>;
}
~~~

当动态参数不存在时：

~~~tsx
import { notFound } from 'next/navigation';

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const note = await getNote((await params).slug);
  if (!note) notFound();
  return <article>{note.title}</article>;
}
~~~

## 四、核心原理

目录层级对应 URL 层级，动态段把 URL 中的字符串传给页面。参数本身只是输入，不代表数据一定存在；必须在数据层验证并决定返回页面、not-found 或错误。

searchParams 与 params 的职责不同：

| 来源 | 适合表达 | 例子 |
| --- | --- | --- |
| params | 资源身份、页面层级 | /notes/go-basics |
| searchParams | 查询条件、分页、排序 | /notes?query=go&page=2 |

把搜索条件放入 URL，用户可以复制链接、刷新页面和使用浏览器前进后退。

## 五、常见场景

- [slug]：笔记、文章、商品详情。
- [id]：数据库主键详情。
- [...segments]：文档树、文件路径。
- searchParams：搜索、筛选、分页、排序。
- generateStaticParams：已知且适合构建时预生成的页面。

## 六、踩坑点

- 直接把 params 当普通对象使用，忽略当前版本的 Promise 类型。
- 把用户输入的 slug 当成已验证的数据库记录。
- 用客户端 State 保存本应可分享的搜索条件。
- 使用 searchParams 后仍以为页面一定是完全静态的。
- 在 layout 中做唯一的授权检查，忽略布局不会在每次导航时都重新执行。

## 七、项目中的实际使用

笔记详情页推荐流程：

1. 从 params 读取 slug。
2. 调用服务器数据访问函数查询笔记。
3. 查询不到时调用 notFound。
4. 通过 generateMetadata 生成标题和描述。
5. 把少量交互，如收藏和复制，交给 Client Component。

## 八、一句话总结

params 表示“访问哪个资源”，searchParams 表示“如何查询资源”，二者都必须经过数据和权限验证。

## 九、核心问答

### 1. 动态路由参数和查询参数有什么区别？

动态路由参数确定资源身份和 URL 层级；查询参数描述筛选、分页和排序。

### 2. 为什么不能只在页面渲染时判断 slug？

因为数据可能不存在、已删除或用户没有权限，资源状态必须在服务器数据层确认。

### 3. 为什么搜索条件适合放在 URL？

可分享、可刷新、可回退，也便于服务端页面直接根据条件获取数据。

### 4. generateStaticParams 解决什么问题？

将已知动态路径在构建时预生成，适合内容稳定且可以提前枚举的页面。

## 十、自测与答案

1. /notes/react?page=2 中哪些是 params，哪些是 searchParams？
2. 详情数据不存在时应该返回空 div、404 还是普通错误？
3. 为什么 layout 中的 auth 检查不能成为唯一安全检查？
4. 为笔记详情页设计一条从 URL 到页面的最小流程。

<details>
<summary>参考答案</summary>

1. 没有动态 params；searchParams 是 query=react 和 page=2。
2. 资源不存在时使用 notFound；服务器异常才进入 error 边界。
3. layout 在客户端导航时可能不会重新渲染，且 Server Action 和数据访问仍需单独校验。
4. 读取 slug → 查询数据库 → 校验不存在和权限 → 渲染页面 → 交互部分交给 Client Component。

</details>
