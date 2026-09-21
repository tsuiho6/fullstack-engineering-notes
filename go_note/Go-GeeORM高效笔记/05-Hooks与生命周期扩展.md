# Hooks 与生命周期扩展：把扩展点放在 CRUD 的因果链上

## 一、是什么

Hook 是 ORM 在创建、查询、更新、删除前后预留的生命周期回调。GeeORM 教学实现通过反射按方法名寻找 `BeforeInsert`、`AfterQuery` 等方法并调用。

## 二、为什么需要

很多模型都有局部且重复的规则：生成默认值、校验状态、更新时间、脱敏、记录审计。若每个 Repository 手动复制，这些规则容易漏掉。Hook 提供统一扩展点，但它只适合紧贴模型生命周期的行为，不适合编排复杂业务流程。

## 三、核心用法

### 1. 教学版约定

```go
type Account struct {
	ID       int64
	Password string
}

func (a *Account) BeforeInsert(s *Session) error {
	a.ID = generateID()
	return nil
}

func (a *Account) AfterQuery(s *Session) error {
	a.Password = "******"
	return nil
}
```

原教程约定 Hook 接收 `*Session`，名称由字符串常量定义：`BeforeQuery`、`AfterQuery`、`BeforeUpdate`、`AfterUpdate`、`BeforeDelete`、`AfterDelete`、`BeforeInsert`、`AfterInsert`。

### 2. 项目推荐：接口优先，反射兜底

```go
type BeforeInserter interface {
	BeforeInsert(context.Context) error
}

func callBeforeInsert(ctx context.Context, model any) error {
	h, ok := model.(BeforeInserter)
	if !ok {
		return nil
	}
	return h.BeforeInsert(ctx)
}
```

接口的优势是编译期检查签名，错误可直接传播。若要支持可选方法、插件或未知模型，才考虑反射；反射调用必须检查方法存在、参数签名和返回值。

### 3. 一个可记忆的生命周期

```text
Insert：BeforeInsert → 读取对象字段 → 执行 INSERT → AfterInsert
Find：  BeforeQuery  → 扫描一行      → AfterQuery
Update：BeforeUpdate → 执行 UPDATE   → AfterUpdate
Delete：BeforeDelete → 执行 DELETE   → AfterDelete
```

失败规则应明确：任何 Before Hook 返回错误，终止数据库操作；After Hook 返回错误，操作结果如何处理必须由框架定义，通常在事务场景中让整个事务回滚。

## 四、核心原理

### 1. Hook 的价值来自“位置”，不是来自反射

Hook 的关键设计问题是：回调放在什么因果节点。`BeforeInsert` 能修改即将写入的对象，`AfterQuery` 能修改已扫描的对象；放错位置就会出现“数据库已经写入但校验才失败”或“脱敏发生在持久化之前”的问题。

### 2. 反射版调用链

```text
得到当前模型值
  → MethodByName("BeforeInsert")
  → 判断 IsValid
  → 校验函数签名
  → Call(ctx/session)
  → 读取 error 返回值
```

教学实现常见的不足是：Hook 返回的错误只被日志记录，不会阻止 CRUD。直观后果是校验失败仍可能写入数据库，这是项目中必须修正的行为。

### 3. Hook 与事务的关系

如果 Hook 内部写数据库，它必须使用当前事务执行器；如果 Hook 触发外部副作用（发邮件、发消息），数据库回滚并不能自动撤销外部动作。此时要用事务消息、Outbox 或提交后事件等更完整的方案。

## 五、常见场景

- ⭐ 设置创建时间、更新时间、默认状态。
- ⭐ 写入前校验模型不变量。
- ⭐ 查询后做轻量派生字段或脱敏。
- △ 记录审计信息，但要明确是否与主操作同一事务。
- ○ 复杂联动、跨聚合事务、调用外部服务：放到 Service 层或事件机制。

## 六、踩坑点

1. Hook 方法名拼错时，反射通常只是“找不到”，若没有测试很难发现。
2. Hook 签名不一致时，直接 `Call` 可能 panic；应在注册阶段验证或使用接口断言。
3. Before Hook 错误不能只打日志；必须返回并终止操作。
4. AfterQuery 脱敏会改变内存对象；如果随后复用该对象更新，可能把脱敏值写回数据库。
5. 批量 Insert 的 Hook 调用次数和对象粒度要明确：逐对象、逐批还是只调用一次。
6. Hook 中再次调用 ORM 可能递归触发 Hook，需定义是否跳过、使用新 Session 或设置上下文标记。
7. Hook 不能替代权限检查；权限通常依赖请求主体，应在 Service/授权层完成。
8. 不要在 Hook 中做不可控的慢操作，否则所有 CRUD 延迟都会被拖长。

## 七、项目中的实际使用

模型 Hook 只保留局部规则：

```go
func (u *User) BeforeInsert(ctx context.Context) error {
	if strings.TrimSpace(u.Name) == "" {
		return errors.New("name is required")
	}
	u.CreatedAt = time.Now().UTC()
	return nil
}
```

而以下逻辑不放 Hook：创建用户后发欢迎邮件、扣库存、写多个聚合、调用第三方支付。这些是业务流程，应由 Service 组织事务和重试策略。

## 八、一句话总结

Hook 是生命周期的插槽；反射只是实现手段，真正必须守住的是调用时机、错误传播和事务边界。

## 九、核心问答

### 1. 为什么项目推荐接口优先而不是反射优先？

接口能在编译期验证方法签名，调用更安全、更容易重构；反射适合可选方法和框架扩展，但必须承担运行时检查成本。

### 2. `BeforeInsert` 和 `AfterQuery` 分别适合改什么？

前者改写入数据库前的默认值或校验状态；后者改查询后内存中的对象，例如派生值或展示脱敏，不能误把展示变更当持久化变更。

### 3. Hook 返回错误后，数据库操作是否一定回滚？

Before Hook 可以阻止尚未执行的操作；After Hook 是否回滚取决于外层是否处于事务以及框架的错误策略。项目应明确约定，并优先让主写操作在事务中运行。

### 4. 为什么 Hook 不适合发送外部消息？

数据库回滚无法撤回已经发出的消息；外部副作用需要可靠事件、Outbox 或提交后处理。

### 5. Hook 和 Middleware 有什么区别？

Hook 绑定模型/数据库生命周期；Middleware 包围请求或服务调用。前者粒度更细，后者能处理鉴权、日志、超时等跨请求关注点。

## 十、自测与答案

### 题目

1. `BeforeInsert` 返回错误时，Insert 应继续执行吗？
2. 为什么 `AfterQuery` 脱敏后不能直接复用对象做 Update？
3. 如何防止反射 Hook 签名不正确导致 panic？
4. 一个 Hook 里需要写另一张表时，应该使用哪个数据库执行器？

<details>
<summary>答案</summary>

1. 不应继续；返回错误并终止当前操作。
2. 内存中的密码已经被替换为掩码，复用更新会把掩码持久化，破坏真实数据。
3. 注册时用接口断言，或在反射调用前检查方法有效、参数数量/类型和返回值类型。
4. 使用当前操作的 `*sql.Tx`/`DBTX`，保证与主操作同一事务；不要偷偷使用外层 `*sql.DB`。

</details>

