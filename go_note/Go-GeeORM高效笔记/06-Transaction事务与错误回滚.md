# Transaction：把多个数据库操作变成一个原子单元

## 一、是什么

事务是一组不可分割的数据库操作：全部成功才提交，任一步失败就回滚。Go 的 `database/sql` 用 `BeginTx`、`*sql.Tx`、`Commit`、`Rollback` 表达这一边界。

## 二、为什么需要

转账至少包含扣款和入账两个写操作。若第一个成功、第二个失败，数据就不一致。事务把这组操作放进同一个提交点，避免部分成功。

## 三、核心用法

### 1. 推荐的事务模板

~~~go
func WithTx(
	ctx context.Context,
	db *sql.DB,
	opts *sql.TxOptions,
	fn func(*sql.Tx) error,
) (err error) {
	tx, err := db.BeginTx(ctx, opts)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback()
			return
		}
		err = tx.Commit()
	}()

	return fn(tx)
}
~~~

调用：

~~~go
err := WithTx(ctx, db, nil, func(tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
		amount, fromID, amount,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance + ? WHERE id = ?",
		amount, toID,
	); err != nil {
		return err
	}
	return nil
})
~~~

注意 `return fn(tx)` 配合命名返回值 `err`，defer 才能看到回调错误并决定回滚或提交。

### 2. GeeORM 的最小集成

~~~go
type Session struct {
	db *sql.DB
	tx *sql.Tx
}

func (s *Session) executor() DBTX {
	if s.tx != nil {
		return s.tx
	}
	return s.db
}
~~~

`Insert`、`Update`、`Delete`、`Find` 都只调用 `executor()`；`Begin` 把 `tx` 设置进去，`Commit/Rollback` 结束它。这样同一套 Session 记录逻辑既能普通执行，也能事务执行。

## 四、核心原理

### 1. ACID 记忆法

- Atomicity：原子性，全部或全部不做。
- Consistency：一致性，事务前后满足约束和业务不变量。
- Isolation：隔离性，并发事务互相看见什么由隔离级别决定。
- Durability：持久性，提交后的结果应能在故障后保留。

ACID 是目标集合，不等于所有数据库/隔离级别都提供同样的并发可见性。尤其要把“原子提交”与“不会发生并发冲突”区分开。

### 2. 事务边界的最小条件

~~~text
BEGIN
  操作 A（tx）
  操作 B（tx）
COMMIT
~~~

如果 B 使用 `db` 而不是 `tx`，它可能在另一个连接上自动提交；此时 A、B 就不再属于同一事务。

### 3. 错误路径是事务设计的核心

| 情况 | 正确动作 |
|---|---|
| `BeginTx` 失败 | 不调用 Rollback，直接返回 |
| 回调返回 error | Rollback，返回原错误 |
| 回调 panic | Rollback 后重新 panic |
| Commit 失败 | 返回 Commit 错误；不要伪装成成功 |
| Rollback 失败 | 通常记录日志；保留原业务错误 |

## 五、常见场景

- ⭐ 转账、库存扣减、订单与支付状态联动。
- ⭐ 写主表和审计表，必须一起成功。
- △ 批量导入：一个大事务或分批事务取决于锁、日志和失败恢复成本。
- ○ 需要跨数据库或跨服务一致性：单库事务不够，要考虑 Saga、Outbox、幂等和补偿。

## 六、踩坑点

1. 事务中混用 `db` 和 `tx`，最常见也最隐蔽。
2. 忘记 Rollback：尤其是回调返回错误和 panic 的路径。
3. 忽略 Commit 错误：提交失败不能当作业务成功。
4. 把事务跨 goroutine 传递或长时间持有：事务通常占住连接，会降低池吞吐。
5. 在事务里做网络调用：网络慢会长时间持锁；外部动作应尽量移出或用可靠事件协调。
6. 重试整个事务时没有幂等设计：可能重复写入或重复扣款。
7. SQLite 的锁行为和 MySQL/PostgreSQL 不同；不要把一个数据库的并发经验直接套到另一个。
8. 事务能保证原子性，不自动保证业务层条件正确；例如扣款仍要检查余额和影响行数。

## 七、项目中的实际使用

Service 层决定事务边界，Repository 接收执行器：

~~~text
Service.Transfer
  → WithTx
     → accountRepo.Debit(ctx, tx, ...)
     → accountRepo.Credit(ctx, tx, ...)
     → ledgerRepo.Append(ctx, tx, ...)
~~~

每个写方法都检查 `RowsAffected`。例如扣款 SQL 即使执行无错误，也要确认确实扣到了 1 行，否则可能是账户不存在或余额不足。

推荐测试：成功提交、第二步失败回滚、panic 回滚、Commit 失败、事务内读取可见性、并发冲突和重试行为。

## 八、一句话总结

事务不是一个 `Begin` API，而是“同一个执行器贯穿全部操作 + 所有错误都能到达回滚/提交决策点”。

## 九、核心问答

### 1. 为什么 `*sql.Tx` 需要替代 `*sql.DB` 执行每一步？

因为 `*sql.DB` 是连接池，单次调用可能落到不同连接；`*sql.Tx` 绑定同一事务和连接，才能共享提交/回滚边界。

### 2. 为什么事务函数需要处理 panic？

panic 也意味着当前业务流程未正常完成；若不回滚，可能长期占用连接或让事务处于未结束状态。回滚后重新 panic，既清理资源又不吞掉程序错误。

### 3. ACID 中隔离性是否等于“完全没有并发问题”？

不是。隔离级别不同，仍可能有脏读、不可重复读、幻读、锁等待或死锁；应用要配合约束、锁、重试和正确的 SQL 条件。

### 4. 为什么 `RowsAffected` 对转账很重要？

SQL 没报错不代表业务条件命中。扣款影响 0 行可能表示余额不足或账户不存在，必须据此回滚。

### 5. 事务能否跨越外部 HTTP 调用？

技术上可以长时间保持事务，但通常不推荐；会延长锁和连接占用，也无法让对方 HTTP 服务参与同一提交。应改为状态机、Outbox、幂等与补偿。

## 十、自测与答案

### 题目

1. 回调返回错误时，事务模板的 defer 为什么要看到命名返回变量？
2. 事务中的第二条 SQL 使用 `db.ExecContext`，会发生什么风险？
3. Commit 失败时应该返回哪个错误？
4. 扣款 SQL 运行成功但影响 0 行，是否应该提交？
5. 为什么不能把一个事务 Session 作为全局对象复用？

<details>
<summary>答案</summary>

1. defer 在回调返回后执行，需要通过命名返回 `err` 判断是回滚还是提交；若使用了被遮蔽的局部变量，可能误提交。
2. 第二条操作可能自动提交或运行在另一个连接，导致原子性失效。
3. 返回 Commit 的错误；它表示数据库没有确认事务成功提交。
4. 通常不应提交，应把 0 行解释为业务失败并返回错误，触发回滚。
5. 事务绑定连接和生命周期，跨请求复用会串事务、阻塞连接并产生数据隔离错误。

</details>

