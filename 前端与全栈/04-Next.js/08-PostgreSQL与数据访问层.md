# PostgreSQL 与数据访问层

> 优先级：⭐ 第二阶段必须掌握：数据库读写、数据访问层和迁移思维。

## 一、是什么

PostgreSQL 是关系型数据库；数据访问层是服务器端代码中负责查询、写入、权限和数据转换的一层。

Next.js 不等于数据库。Next.js 提供运行位置和请求边界，PostgreSQL 负责持久化、事务、约束和查询。

## 二、为什么需要

内存变量会在进程重启后丢失，文件存储难以处理并发和关系。PostgreSQL 适合用户、笔记、标签、权限和审计记录等结构化数据。

数据访问层能避免页面组件直接散落 SQL、权限和缓存逻辑。

## 三、核心用法

推荐把数据库模块标记为 server-only：

~~~ts
import 'server-only';

export async function findNoteBySlug(slug: string) {
  return db.note.findUnique({
    where: { slug },
  });
}
~~~

使用数据库客户端的参数化查询能力：

~~~ts
const notes = await db.note.findMany({
  where: { title: { contains: query } },
  orderBy: { updatedAt: 'desc' },
  take: limit,
});
~~~

写入时使用数据库约束和事务：

~~~ts
await db.$transaction(async (tx) => {
  const note = await tx.note.create({ data: noteInput });
  await tx.noteTag.createMany({ data: tagsFor(note.id) });
  return note;
});
~~~

## 四、核心原理

### 1. 代码关系

~~~text
页面 / Server Action
    ↓
领域数据函数
    ↓
数据库客户端
    ↓
PostgreSQL
~~~

页面只关心需要什么数据，数据访问层负责查询、类型、权限和错误转换。

### 2. SQL 与 ORM

SQL 是数据库通用语言；ORM 通过类型和模型降低重复代码。学习阶段仍应掌握 SELECT、JOIN、WHERE、ORDER BY、LIMIT、INSERT、UPDATE、DELETE 和事务，因为 ORM 最终也会生成 SQL。

### 3. 连接管理

服务器less 或频繁扩缩容环境中，连接数需要池化或使用适合平台的数据库驱动。不要在每次组件渲染中随意创建新的数据库客户端。

## 五、常见场景

- 笔记和用户的 CRUD。
- 标签、多对多关系。
- 搜索和分页。
- 用户归属和权限过滤。
- 事务性写入。
- 迁移、种子数据和测试数据库。

## 六、踩坑点

- 把数据库客户端导入 Client Component。
- 使用字符串拼接 SQL，产生注入风险。
- 只在页面过滤权限，数据访问函数却返回全部记录。
- 没有唯一约束，导致 slug、email 或关系重复。
- 用查询全部数据再在 JS 中分页。
- 将生产数据库用于随意实验或种子脚本。
- 忽略连接池和部署平台的连接限制。

## 七、项目中的实际使用

学习资料库的最小表：

~~~text
users
notes
tags
note_tags
~~~

建议顺序：

1. 先手写最小 SQL，理解关系和索引。
2. 再使用 Prisma、Drizzle 或 postgres.js 等工具。
3. 把查询函数放在服务器模块。
4. 在查询函数附近做身份和资源授权。
5. 写入后触发缓存失效。

对你而言，PostgreSQL 不是 Next.js 基础的第一天内容，而是“能独立做全栈应用”的第二阶段。先能完成 SQLite 或托管 Postgres 的最小 CRUD，再深入索引、事务和查询计划。

## 八、一句话总结

页面描述需求，数据访问层保护边界，PostgreSQL 保证持久化、关系和一致性。

## 九、核心问答

### 1. 为什么 Server Component 可以直接查数据库？

它运行在服务器，数据库凭证不会发送到浏览器，也可以少一层自己维护的 API。

### 2. ORM 能否替代 SQL 学习？

不能完全替代。ORM 适合日常开发，但 SQL 决定查询性能、连接关系和最终结果。

### 3. 权限检查应该放在哪？

至少放在数据访问或写入函数附近，页面显示控制只能改善体验，不能成为安全边界。

### 4. 为什么要使用事务？

当一次业务操作包含多个必须同时成功或失败的写入时，事务可以维护数据一致性。

## 十、自测与答案

1. 一个笔记详情查询需要哪些输入和输出？
2. 查询分页应在数据库做还是 JavaScript 中做？
3. 为什么 app/lib/data.ts 适合导入 server-only？
4. 删除笔记和删除它的标签关系，为什么可能需要事务？

<details>
<summary>参考答案</summary>

1. 输入通常是经过校验的 slug 和当前身份；输出是脱敏且符合页面需要的 Note 或 null。
2. 在数据库中做，减少传输和内存，也让数据库利用索引。
3. 防止它被错误导入客户端，并保护数据库客户端和凭证。
4. 两个写入需要保持一致，否则可能出现孤儿关系或半完成状态。

</details>
