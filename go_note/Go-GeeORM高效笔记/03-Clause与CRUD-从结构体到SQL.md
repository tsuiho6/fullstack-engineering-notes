# 从结构体到 SQL：Clause、Insert 与 Find

## 一、是什么

Clause 是 SQL 语句的结构化构建器：把 `SELECT`、`WHERE`、`ORDER BY`、`LIMIT` 等子句分别保存，最后按 SQL 语法顺序合并成“SQL 文本 + 参数列表”。CRUD 则把 Schema、Clause、反射和值扫描串成最小闭环。

## 二、为什么需要

如果每个 CRUD 方法都手写整条 SQL，条件组合、参数顺序和扩展会快速失控。Clause 把“如何组合”与“如何执行”分离：生成器负责 SQL，Session 负责执行，反射负责对象与行的转换。

## 三、核心用法

### 1. Clause 的最小形状

```go
type Kind int

const (
	Select Kind = iota
	Values
	Where
	OrderBy
	Limit
)

type Part struct {
	SQL  string
	Args []any
}

type Clauses struct {
	parts map[Kind]Part
}

func (c *Clauses) Set(kind Kind, p Part) {
	if c.parts == nil {
		c.parts = make(map[Kind]Part)
	}
	c.parts[kind] = p
}

func (c *Clauses) Build(order ...Kind) (string, []any) {
	var sqls []string
	var args []any
	for _, kind := range order {
		if p, ok := c.parts[kind]; ok {
			sqls = append(sqls, p.SQL)
			args = append(args, p.Args...)
		}
	}
	return strings.Join(sqls, " "), args
}
```

关键输出必须同时存在：

```text
SQL：  SELECT Name, Age FROM User WHERE Age > ? ORDER BY Age DESC LIMIT ?
Args： [18, 10]
```

### 2. 最小查询闭环

```go
var users []User
err := s.Model(User{}).
	Where("age >= ?", 18).
	OrderBy("age DESC").
	Limit(10).
	Find(ctx, &users)
```

推荐约定：查询终点方法接收目标指针；调用后目标 slice 被填充，错误通过 `error` 返回。

### 3. Insert：先按 Schema 顺序展平字段值

```text
Schema.FieldNames = [Name, Age]
u1 = User{Name:"Tom", Age:18}
u2 = User{Name:"Sam", Age:25}

SQL：INSERT INTO User (Name, Age) VALUES (?, ?), (?, ?)
Args：["Tom", 18, "Sam", 25]
```

插入的核心不是 `Exec`，而是保证每一行的值都按同一个字段顺序展平。最后使用 `ExecContext`，返回 `RowsAffected`。

### 4. Find：目标必须是“slice 的指针”

```go
var users []User
if err := s.Find(ctx, &users); err != nil {
	return err
}
```

回填步骤：

1. 校验目标是 `*[]T`。
2. 得到元素类型 `T`。
3. 每次 `rows.Next()` 创建一个可寻址的 `T`。
4. 按 Schema 字段顺序创建扫描地址 `[]any`。
5. `rows.Scan(scanArgs...)`。
6. 将该元素追加到目标 slice。
7. 循环结束检查 `rows.Err()`。

扫描地址的形状示意：

```go
elem := reflect.New(elemType).Elem() // 可设置的 T
scanArgs := make([]any, len(schema.Fields))
for i, field := range schema.Fields {
	scanArgs[i] = elem.Field(field.Index).Addr().Interface()
}
if err := rows.Scan(scanArgs...); err != nil {
	return err
}
destSlice.Set(reflect.Append(destSlice, elem))
```

这段示意只适合“非嵌套、可导出、数据库 NULL 与 Go 字段类型兼容”的最小模型。

## 四、核心原理

### 1. Clause 的真正约束：顺序与参数必须同步

设子句序列为 (C_1, C_2, ldots, C_n)，每个子句产生 SQL 片段 (s_i) 和参数序列 (a_i)，则：

\[
SQL = s_1 \Vert s_2 \Vert \cdots \Vert s_n,
\quad Args = a_1 \Vert a_2 \Vert \cdots \Vert a_n
\]

其中 `\Vert` 表示按顺序拼接。直观含义：SQL 中第一个 `?` 必须对应 Args 的第一个值；只拼文本不拼参数，或调整文本顺序不调整参数顺序，都会得到错误结果。

### 2. Insert 和 Find 是相反的两个变换

```text
Insert：struct 值 → 按列顺序展平 → SQL 参数
Find：  SQL 行   → 按列顺序扫描 → struct 值
```

因此二者共享同一个 Schema 字段顺序；Schema 顺序不稳定，写入和读取都会不稳定。

### 3. 为什么不能用 map 直接决定列顺序

Go map 的迭代顺序不应作为 SQL 契约。`UPDATE` 的 SET 子句尤其容易受此影响，导致 SQL 文本和测试快照不稳定。项目中要么按 Schema 固定字段顺序，要么对 key 排序，或者使用保序的字段列表。

## 五、常见场景

- ⭐ 单表新增与查询。
- ⭐ 分页查询：`Where + OrderBy + Limit`。
- ⭐ 复用 Clause 做 `Count`、`First`、`Update`、`Delete`。
- △ 查询 DTO：只选择部分列并回填专用 struct。
- ○ 复杂 JOIN/聚合/窗口函数：ORM DSL 难以表达时直接使用参数化原生 SQL。

## 六、踩坑点

1. `Find(&users)` 正确，`Find(users)` 不能改变调用方 slice 长度。
2. `[]User` 与 `[]*User` 是不同的目标形状，必须明确是否支持；不要“半支持”。
3. `SELECT` 列顺序与 `Scan` 地址顺序必须一致；不能假设数据库返回顺序。
4. 未处理 `NULL` 时，扫描到 `string/int` 可能失败；使用 `sql.NullString`、`sql.NullInt64`、指针或自定义 Scanner。
5. `rows.Next()` 结束不代表没有错误，必须检查 `rows.Err()`。
6. `reflect.Value.Field(i).Addr()` 只有字段可寻址、可导出时才安全。
7. `First` 的“第一条”若没有 `ORDER BY`，在数据库语义上通常不是稳定的第一条。
8. 生成器只应生成受控结构；条件值走参数，不要直接格式化进去。

## 七、项目中的实际使用

推荐把流程拆成三层：

```text
Builder：where/order/limit 只改变查询描述
Compiler：Schema + Builder → (SQL, args)
Executor：DBTX + context → Result / Rows
Mapper：Rows → DTO / Model
```

测试至少覆盖：

- Clause 的 SQL 文本和参数是否同步。
- Insert 多行时参数数量是否为“行数 × 列数”。
- Find 空结果时返回空 slice 还是 `ErrNotFound`，语义要固定。
- NULL、时间、二进制、超大整数的扫描行为。
- 查询失败、扫描失败、迭代失败时资源是否释放。

## 八、一句话总结

Clause 管结构，Schema 管顺序，反射管形状，`database/sql` 管执行；CRUD 的正确性首先是 SQL 与参数一一对应。

## 九、核心问答

### 1. 为什么 Clause 要保存 SQL 和参数，而不是只保存 SQL？

因为参数必须通过驱动绑定，才能避免把值误当 SQL；同时最终 SQL 的占位符顺序必须与参数顺序一致。

### 2. `Insert` 与 `Find` 的反射方向有何不同？

Insert 从已有对象读取字段值并展平；Find 从每一行创建可设置对象、提供字段地址给 `Scan`，再追加到 slice。

### 3. 为什么 `Find` 常要求 `*[]User` 而不是 `[]User`？

函数需要修改 slice 的长度和底层数据；传值只能修改副本，传指针才能替换调用方的 slice。

### 4. 为什么不建议让 `Where` 直接接受任意字符串拼接？

值拼接会引入 SQL 注入；即便值参数化，任意 SQL 片段也会破坏方言适配、审计和权限边界。应区分受控表达式与参数。

### 5. 什么情况下应绕过 ORM？

复杂 JOIN、聚合、窗口函数、数据库特有能力或性能需要精确控制时，直接写参数化 SQL 往往更清晰；ORM 与原生 SQL 可以共存。

## 十、自测与答案

### 题目

1. `Where("age > ?", 18).Limit(10)` 的 SQL 和参数应是什么？
2. 多行 Insert 的字段顺序由谁决定？
3. `rows.Next()` 循环结束后为什么还要调用 `rows.Err()`？
4. 如果数据库列允许 NULL，而 Go 字段是 `string`，应该怎么处理？
5. 为什么 Clause 的 Build 方法要接收显式 order，而不是遍历 map？

<details>
<summary>答案</summary>

1. `WHERE age > ? LIMIT ?`，参数为 `[18, 10]`，最终还要拼接 SELECT 主体。
2. 由 Schema 的固定字段顺序决定；每一行都按同一顺序展平。
3. 行迭代中可能发生驱动或网络错误，`Next` 结束本身无法区分“正常结束”和“异常结束”。
4. 使用 `sql.NullString`、`*string` 或自定义 `Scanner/Valuer`，并定义空值映射规则。
5. map 无法表达 SQL 语法顺序；显式 order 同时固定文本顺序和参数顺序。

</details>

