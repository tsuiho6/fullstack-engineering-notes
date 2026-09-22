# 当前版本缓存 API 补充

> 优先级：△ 版本补充：以实际 Next.js 版本和官方文档为准，不作为最初学习主线。

这篇用于配合《数据获取、缓存与重新验证》阅读。Next.js 的缓存模型正在演进，实际项目要先确认是否启用了 Cache Components。当前官方文档将这套模型与 next.config.ts 中的 cacheComponents: true 配置关联；未启用时先看上一代模型的文档，不要混用两套默认行为。

## 一、当前推荐的概念模型

~~~text
use cache
    ↓
cacheLife：缓存多久
    ↓
cacheTag：给缓存命名
    ↓
updateTag / revalidateTag / revalidatePath：何时让它更新
~~~

## 二、最小示例

~~~ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getNotes() {
  'use cache';
  cacheLife('hours');
  cacheTag('notes');
  return db.note.findMany();
}
~~~

写入后让当前用户立即看到自己的修改：

~~~ts
import { updateTag } from 'next/cache';

export async function updateNote(id: string, title: string) {
  'use server';
  await db.note.update({ where: { id }, data: { title } });
  updateTag('notes');
}
~~~

允许旧内容短暂展示，并在后台重新生成：

~~~ts
import { revalidateTag } from 'next/cache';

revalidateTag('notes', 'max');
~~~

不知道具体标签、只知道页面路径时：

~~~ts
import { revalidatePath } from 'next/cache';

revalidatePath('/notes');
~~~

## 三、怎么选择

| 需求 | API |
| --- | --- |
| 读数据并定义缓存寿命 | use cache + cacheLife |
| 给一组相关缓存命名 | cacheTag |
| Server Action 写入后立即看到新值 | updateTag |
| 允许 stale-while-revalidate | revalidateTag(tag, 'max') |
| 按 URL 路径整体失效 | revalidatePath |

如果项目没有启用 Cache Components，官方仍提供上一代 fetch 缓存和重新验证模型。不要把两套模型的配置和默认行为混在一起；先看项目的 next.config.ts 和 Next.js 版本。

## 四、记忆锚点

cacheLife 管时间，cacheTag 管分组，updateTag 管立即变新，revalidateTag 管后台刷新，revalidatePath 管页面范围。

## 五、官方参考

- [Revalidating](https://nextjs.org/docs/app/getting-started/revalidating)
- [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
