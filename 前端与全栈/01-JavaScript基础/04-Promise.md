# Promise

> 优先级：⭐

## 一、是什么

Promise 表示一个未来才会得到的异步结果。它有三种状态：

~~~text
pending → fulfilled
pending → rejected
~~~

状态只能从 pending 进入一次最终状态。

## 二、为什么需要

Promise 把“未来的结果”包装成对象，使异步任务可以：

- 链式处理
- 统一捕获错误
- 并行等待多个任务
- 和 async/await 配合

## 三、核心用法

~~~js
fetch('/api/users')
  .then((response) => {
    if (!response.ok) {
      throw new Error('请求失败')
    }
    return response.json()
  })
  .then((users) => {
    console.log(users)
  })
  .catch((error) => {
    console.error(error)
  })
  .finally(() => {
    console.log('请求结束')
  })
~~~

每个 then 都返回一个新的 Promise。回调返回普通值时，后续得到 fulfilled；回调抛错或返回 rejected Promise 时，后续进入 catch。

### 常用组合

~~~js
const [user, permissions] = await Promise.all([
  fetchUser(),
  fetchPermissions(),
])
~~~

- Promise.all：全部成功才成功，一个失败就失败。
- Promise.allSettled：等待全部结束，收集每个结果。
- Promise.race：第一个结束的结果决定整体结果。
- Promise.any：第一个成功的结果决定整体结果，全部失败才失败。

## 四、核心原理

Promise 解决的是“结果管理”，不是“自动并行”。

并行：

~~~js
const userPromise = fetchUser()
const settingsPromise = fetchSettings()

const [user, settings] = await Promise.all([
  userPromise,
  settingsPromise,
])
~~~

串行：

~~~js
const user = await fetchUser()
const settings = await fetchSettings()
~~~

如果第二个任务不依赖第一个任务，串行写法会浪费时间。

## 五、常见场景

- 网络请求。
- 文件或数据库操作。
- 并行加载多个独立资源。
- 超时、重试和取消。
- 异步任务组合。

## 六、踩坑点

1. Promise 的 executor 会立即同步执行。
2. 已经有 Promise 时不要无意义地重复 new Promise。
3. fetch 遇到 404 或 500 通常不会自动 reject，要检查 response.ok。
4. 链式 then 中忘记 return 会导致后续拿到 undefined。
5. Promise.all 失败时不会自动取消其他任务。

## 七、项目中的实际使用

把 HTTP 错误转换为异常：

~~~js
async function requestJson(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error('HTTP ' + response.status)
  }

  return response.json()
}
~~~

请求函数负责数据和异常，页面层负责加载、成功、空数据和错误状态。

## 八、一句话总结

Promise 管理未来结果；先启动独立任务，再用组合方法等待，才能正确表达并行和错误边界。

## 九、核心问答

### 1. Promise 有哪些状态？

pending、fulfilled、rejected，最终状态只能确定一次。

### 2. Promise.all 和 Promise.allSettled 如何选择？

所有任务必须成功时用 all；需要收集每个任务结果时用 allSettled。

### 3. 为什么 fetch 需要检查 response.ok？

网络请求成功不等于 HTTP 业务成功，404 和 500 仍可能得到一个正常的 Response。

### 4. 连续两个 await 有什么风险？

第二个任务会在第一个完成后才启动；如果两者没有依赖，就会产生不必要的串行等待。

## 十、自测与答案

### 题目

1. Promise 的最终状态可以改变两次吗？
2. Promise.all 中一个任务失败会怎样？
3. 如何让两个互不依赖的请求并行？
4. fetch 收到 404 时一定会进入 catch 吗？

<details>
<summary>查看答案</summary>

1. 不可以，Promise 只能从 pending 进入一次最终状态。
2. 整体 reject，但其他任务可能仍在执行。
3. 先分别调用请求函数，再用 Promise.all 等待。
4. 不一定，需要检查 response.ok 并主动抛出错误。

</details>
