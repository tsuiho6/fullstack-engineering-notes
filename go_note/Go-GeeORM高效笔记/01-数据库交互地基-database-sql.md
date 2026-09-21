# 数据库交互地基：`database/sql`、Engine 与 Session

## 一、是什么

`database/sql` 是 Go 对数据库驱动提供的统一访问层。`*sql.DB` 代表可并发复用的数据库句柄/连接池，`*sql.Tx` 代表一次事务，`Session` 则是 ORM 对 SQL、参数、模型和执行器的轻量封装。

## 二、为什么需要

直接在业务代码里散落 `Open`、`Exec`、`Query`、`Scan`、关闭资源，会导致 SQL 日志、错误处理、事务切换、连接生命周期重复出现。GeeORM 把这些重复工作集中到 `Engine` 与 `Session`，让上层只描述“操作什么数据”。

## 三、核心用法

### 1. 启动时建立并验证数据库句柄

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

db, err := sql.Open(driverName, dsn)
if err != nil {
	return err
}
if err := db.PingContext(ctx); err != nil {
	_ = db.Close()
	return err
}
defer db.Close()
```

输入：驱动名、DSN、超时上下文。输出：可复用的 `*sql.DB`。注意：`sql.Open` 通常只是创建句柄，不等于已经连通；启动检查用 `PingContext`，请求路径不要每次 `Open`。

### 2. 写操作、单行查询、多行查询

```go
result, err := db.ExecContext(ctx,
	"INSERT INTO users (name, age) VALUES (?, ?)",
	"Tom", 18,
)
if err != nil {
	return err
}
affected, err := result.RowsAffected()
if err != nil {
	return err
}

row := db.QueryRowContext(ctx,
	"SELECT name, age FROM users WHERE id = ?", id,
)
var u User
if err := row.Scan(&u.Name, &u.Age); err != nil {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

rows, err := db.QueryContext(ctx,
	"SELECT name, age FROM users WHERE age >= ?", 18,
)
if err != nil {
	return err
}
defer rows.Close()

for rows.Next() {
	var u User
	if err := rows.Scan(&u.Name, &u.Age); err != nil {
		return err
	}
	// consume u
}
if err := rows.Err(); err != nil {
	return err
}
```

### 3. `DBTX`：让普通执行与事务执行复用同一套记录逻辑

```go
type DBTX interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

var _ DBTX = (*sql.DB)(nil)
var _ DBTX = (*sql.Tx)(nil)
```

`Session` 只依赖 `DBTX`，因此同一个 `Insert`/`Find` 实现可以在普通模式使用 `*sql.DB`，在事务模式使用 `*sql.Tx`。

### 4. 教学实现与项目实现的差别

教学版 Session 维护一个 `strings.Builder` 和 `[]interface{}`，`Raw(...).Exec()` 后清空状态；这能直观看到 ORM 的最小骨架。项目推荐额外带上 `context.Context`，让每次查询都有超时、取消和链路追踪入口。

## 四、核心原理

### 1. `Exec`、`Query`、`QueryRow` 的选择

| 方法 | 返回形状 | 典型用途 |
|---|---|---|
| `ExecContext` | `sql.Result` | `INSERT/UPDATE/DELETE/DDL` |
| `QueryRowContext` | 单个 `*sql.Row` | 期望 0 或 1 行；错误在 `Scan` 时出现 |
| `QueryContext` | `*sql.Rows` | 0 到多行；必须关闭并检查 `rows.Err()` |

直观记忆：写操作拿“影响结果”，单行拿“延迟扫描的行”，多行拿“行游标”。

### 2. 占位符的安全边界

```sql
SELECT name FROM users WHERE age > ?   -- 值可绑定
```

占位符绑定的是值，不是 SQL 语法。下面的表名不能安全地写成 `FROM ?`：

```text
值：来自用户输入时用参数绑定。
标识符：来自受控 Schema/白名单，经过方言的 QuoteIdent。
SQL 片段：不要把任意用户输入直接拼进去。
```

### 3. `*sql.DB` 不是一条连接

`*sql.DB` 管理连接池，适合跨请求共享；每次操作可能使用不同连接。事务把多个操作绑定到一个 `*sql.Tx`，因此事务中的所有 SQL 都必须从该 `tx` 执行。

## 五、常见场景

- ⭐ 应用启动：打开数据库、设置连接池参数、Ping、准备迁移。
- ⭐ Repository：通过 `ExecContext`/`QueryContext` 执行查询。
- ⭐ 事务服务：使用 `BeginTx` 得到 `*sql.Tx`，将它传给所有写操作。
- △ 教学 ORM：用 Session 累积 SQL 和参数，展示“生成与执行”的分层。
- ○ 复杂 JOIN、窗口函数、性能敏感查询：可以保留原生 SQL，不必强行塞进 ORM DSL。

## 六、踩坑点

1. 忘记 `rows.Close()`：连接可能无法及时归还连接池。
2. 忘记 `rows.Err()`：迭代中发生的网络/驱动错误可能被吞掉。
3. 把 `QueryRow` 的错误只看成 `QueryRow` 返回值：真正的错误通常在 `Scan` 时返回。
4. 把 `sql.ErrNoRows` 当成系统错误：它通常表示业务上的“未找到”。
5. 在事务回调里使用外层 `db`：这会绕过当前事务。
6. 用 `log.Fatal` 或 `panic` 处理普通数据库错误：库代码应返回错误，由应用决定是否终止。
7. 连接参数和超时没有统一管理：长查询会占满连接池；生产代码应使用 `context` 和合理的池配置。

## 七、项目中的实际使用

推荐分层：

```text
main / bootstrap
  └─ OpenDB + Ping + Close
service
  └─ 组织事务边界和业务规则
repository
  └─ 只负责 SQL/ORM 查询与结果映射
session/query builder
  └─ 负责执行器、条件和 SQL 生成
```

Repository 不应持有一个跨请求、可变的 Session。可以共享 `*sql.DB`，但查询条件对象应按调用创建，或明确提供不可变/可复制的 Builder。

## 八、一句话总结

`database/sql` 负责可靠执行，Engine 管生命周期，Session 管一次操作，`*sql.DB` 可共享而 `*sql.Tx` 必须贯穿同一事务。

## 九、核心问答

### 1. `sql.Open` 成功是否说明数据库可用？

不一定。它主要创建数据库句柄；启动时用 `PingContext` 进行实际连通性检查。

### 2. 为什么 `QueryRowContext` 不返回 `error`？

它返回延迟扫描的 `*sql.Row`，数据库错误、未找到等结果在 `Scan` 时统一暴露。

### 3. 为什么查询结果必须 `defer rows.Close()`？

`Rows` 可能占用连接和驱动资源；关闭后连接才能及时回池。

### 4. `*sql.DB` 与 `*sql.Tx` 的共同抽象有什么用？

让 CRUD 只依赖最小执行接口，从而同一套逻辑既能自动提交，也能加入事务。

### 5. 占位符能否替代表名？

通常不能。占位符用于值；表名、列名必须来自受控元数据并由方言安全引用。

## 十、自测与答案

### 题目

1. 写出多行查询的资源管理闭环。
2. `sql.ErrNoRows` 应在哪个调用点判断？
3. 为什么 ORM 的 `Raw` 仍要保存 SQL 参数，而不是直接拼字符串？
4. 事务回调中某一步失败，哪些操作必须回滚？

<details>
<summary>答案</summary>

1. `QueryContext` → 判断初始错误 → `defer rows.Close()` → 循环 `Next`/`Scan` → 最后检查 `rows.Err()`。
2. `QueryRowContext(...).Scan(...)` 的返回值。
3. 参数绑定能避免值被当成 SQL 语法，并交给驱动处理转义和类型转换。
4. 当前事务中已经执行的所有数据库写操作；它们必须使用同一个 `*sql.Tx`。

</details>

