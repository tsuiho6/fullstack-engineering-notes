# 对象表映射：Schema、Dialect 与反射元数据

## 一、是什么

`Schema` 是“Go struct 如何对应数据库表”的元数据：表名、字段名、数据库类型、标签和字段索引。`Dialect` 是数据库差异的适配层：把 Go 类型、标识符引用、表存在性检查等转换成具体数据库能理解的形式。

## 二、为什么需要

同一个 `User` struct，在 SQLite、MySQL、PostgreSQL 中的类型名、占位符、标识符引用和系统表查询可能不同。如果业务逻辑直接拼这些差异，增加数据库支持就会复制整套 ORM。把差异隔离到 Dialect，Schema 只处理统一的模型描述。

## 三、核心用法

### 1. 一个最小模型

```go
type User struct {
	ID   int64  `geeorm:"primaryKey"`
	Name string `geeorm:"column:name"`
	Age  int
}
```

教学版本常用 `geeorm:"PRIMARY KEY"`，项目中应先定义稳定的 tag 语法，再由 Schema 解释；不要让用户随意把整段 SQL 约束注入 tag。

### 2. 最小 Dialect 接口

```go
type Dialect interface {
	DataTypeOf(t reflect.Type) (string, error)
	QuoteIdent(name string) string
	TableExistsQuery(table string) (string, []any)
}
```

`DataTypeOf` 的输入是 Go 类型而非某一行的值；`QuoteIdent` 只处理受控标识符；`TableExistsQuery` 返回 SQL 与参数，表名值仍通过参数传递或白名单校验。

### 3. Parse 的核心流程

```go
type Field struct {
	Name  string
	Column string
	Type  string
	Index int
	Tag   reflect.StructTag
}

type Schema struct {
	Model      reflect.Type
	Table      string
	Fields     []Field
	FieldNames []string
}

func Parse(model any, d Dialect) (*Schema, error) {
	t := reflect.TypeOf(model)
	for t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	if t.Kind() != reflect.Struct {
		return nil, fmt.Errorf("model must be struct, got %s", t.Kind())
	}

	s := &Schema{Model: t, Table: t.Name()}
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if f.PkgPath != "" { // unexported
			continue
		}
		column := f.Name
		if tag, ok := f.Tag.Lookup("geeorm"); ok {
			column = parseColumnName(tag, column)
		}
		dbType, err := d.DataTypeOf(f.Type)
		if err != nil {
			return nil, fmt.Errorf("field %s: %w", f.Name, err)
		}
		s.Fields = append(s.Fields, Field{
			Name: f.Name, Column: column, Type: dbType,
			Index: i, Tag: f.Tag,
		})
		s.FieldNames = append(s.FieldNames, column)
	}
	return s, nil
}
```

上面是主干示意；实际 `parseColumnName` 要明确支持的语法，不能把标签直接当 SQL 片段拼进去。

### 4. 反射的四个动作

```text
reflect.TypeOf(&User{}) → *User 的类型
Elem / 逐层解引用       → User 的 struct 类型
NumField + Field(i)     → 字段元数据
reflect.ValueOf(&user).Elem() → 可修改的 User 值
```

## 四、核心原理

### 1. Schema 是编译结果，不是行数据

```text
struct 类型 ──Parse──> Schema 元数据 ──生成──> CREATE/SELECT/INSERT SQL
struct 值   ──Value──> 行参数        ──绑定──> ? 占位符
数据库行    ──Scan───> 可寻址 struct  ──追加──> []User
```

直观含义：类型决定“列怎么定义”，值决定“这一行写什么”；把二者混淆会造成把 `reflect.Type` 当成 `reflect.Value` 的错误。

### 2. 为什么只映射导出字段

Go 的反射规则要求字段可导出才适合被外部包读取/设置。`StructField.PkgPath != ""` 通常表示未导出字段。ORM 自动读写未导出字段会破坏封装，也容易在 `Interface()` 或 `Addr()` 处 panic。

### 3. 类型映射不是一一对应

一个 Go 类型可能对应多个数据库类型策略：

| Go 类型 | 教学 SQLite 映射 | 项目判断 |
|---|---|---|
| `int`/`int32` | `integer` | 注意范围和跨平台宽度 |
| `int64` | `bigint` | 常用于 ID/时间戳 |
| `float64` | `real` | 金额通常不要直接用浮点 |
| `string` | `text` | 需考虑长度/索引策略 |
| `[]byte` | `blob` | 与 `[]T` 的语义不要混淆 |
| `time.Time` | `datetime` | 需统一时区和序列化 |
| nullable 值 | 不能只靠零值表达 | 使用 `sql.Null*` 或指针/自定义类型 |

## 五、常见场景

- ⭐ 初始化表、生成基础 CRUD SQL。
- ⭐ 按 struct 类型缓存字段映射，避免每次请求重复解析。
- △ 支持多数据库时，用 Dialect 隔离类型和语法。
- △ 用 tag 覆盖列名、主键、索引、非空等元数据。
- ○ 嵌入 struct、关联关系、复合主键、自动时间字段：属于更大 ORM 的扩展。

## 六、踩坑点

1. `reflect.TypeOf(nil)` 是 `nil`，不能直接 `.Kind()`；先校验。
2. `reflect.Indirect` 只解一层并且对 nil 指针可能得到无效值；项目代码应显式逐层解引用并检查。
3. `modelType.Name()` 只有 struct 类型才有意义；指针名通常为空。
4. 字段顺序是 Scan 和 Insert 的契约；SQL 列顺序、扫描地址顺序、参数顺序必须一致。
5. `int` 的宽度、`time.Time`、`[]byte`、`NULL` 与零值不是一回事。
6. 表名和列名不能用值占位符；应由 Schema 生成并由 Dialect 引用。
7. 教学版全局 Dialect 注册表适合演示，不适合无约束地全局修改；项目可在 Engine 中显式注入 Dialect。
8. tag 中直接写 `PRIMARY KEY` 虽直观，但会把 SQL 方言暴露给模型；项目更适合结构化 tag，再由 Dialect 生成约束。

## 七、项目中的实际使用

推荐把 Schema 解析放到 Engine/Registry 层：

```text
启动或首次遇到模型
  → 校验 struct 与 tag
  → 解析 Schema
  → 按 reflect.Type 缓存
请求执行
  → 只读 Schema
  → 生成 SQL / 读取字段索引
```

对于真实项目，优先明确：

1. 表名来自显式配置或模型方法，不默认把 Go 类型名直接暴露到数据库。
2. 列名、主键、可空、默认值、索引必须能被测试验证。
3. 不支持的类型在启动/注册阶段报错，不要等到线上 Scan 才 panic。
4. 复杂 SQL 的列投影可以使用专门 DTO，不必强迫所有查询都回填完整模型。

## 八、一句话总结

Schema 负责描述“对象是什么”，Dialect 负责解释“数据库怎么说”，反射只是在两者之间读取类型、字段和值。

## 九、核心问答

### 1. `reflect.Type` 和 `reflect.Value` 的区别是什么？

`Type` 描述结构和字段元数据；`Value` 代表某个运行时值，可用于读取或修改字段。建表主要用 Type，插入/回填主要用 Value。

### 2. 为什么 Dialect 不应直接散落在 Session 的每个方法里？

那会让 CRUD 同时承担数据库差异，新增数据库必须修改所有操作。集中到 Dialect 后，Session 只依赖稳定接口。

### 3. 为什么不能只用 struct 字段的零值区分“没传”和“传了 0”？

普通 Go 值没有“未设置”状态；更新时 `0` 可能是合法新值。需要指针、可选类型、字段选择列表或显式更新 map。

### 4. 为什么 schema 元数据适合缓存？

同一 struct 类型的字段和类型在运行期通常不变，重复反射只增加开销；缓存后每次查询只做值层面的工作。

### 5. `[]byte` 为什么不应和任意 slice 一样处理？

数据库驱动通常把 `[]byte` 视为二进制列；`[]User` 是容器形状。一个是字段值，一个是查询结果目标，语义完全不同。

## 十、自测与答案

### 题目

1. 给定 `&[]User{}`，如何得到 `User` 的 `reflect.Type`？
2. Schema 中为什么同时保存 `Fields` 和 `FieldNames`？
3. 哪些内容应放进 Dialect，哪些不应放？
4. 一个未导出字段若强行回填，最可能遇到什么问题？
5. 设计一个 tag 时，为什么推荐结构化语法而不是整段 SQL？

<details>
<summary>答案</summary>

1. 先 `reflect.TypeOf(dest)`，逐层 `Elem` 到 slice，再取 `Elem` 得到 `User`；同时要确保 dest 是非 nil 的 slice 指针。
2. `Fields` 保留完整元数据；`FieldNames` 便于按固定顺序生成 SELECT/INSERT 和构造扫描地址。
3. 类型名、占位符、标识符引用、表存在性查询等数据库差异放 Dialect；业务条件、事务边界、模型校验不放。
4. 字段不可 Interface/Set，可能 panic 或被静默跳过，因此默认只处理可导出字段。
5. 结构化 tag 可以校验、跨方言转换和组合；原始 SQL 片段既难验证又容易注入或绑定特定数据库。

</details>

