# async/await

> 优先级：⭐

## 一、是什么

async/await 是 Promise 的语法形式：

- async 函数始终返回 Promise。
- await 等待一个 Promise 的结果。
- await 只暂停当前异步函数，不会阻塞整个 JavaScript 线程。

## 二、为什么需要

它让异步流程更像同步代码，更容易表达：

- 正常流程
- 错误边界
- 返回值关系
- 资源清理

但它不会自动让代码并行，也不会自动处理所有错误。

## 三、核心用法

~~~js
async function loadUser(id) {
  const response = await fetch('/api/users/' + id)

  if (!response.ok) {
    throw new Error('加载用户失败')
  }

  return response.json()
}

async function main() {
  try {
    const user = await loadUser('1')
    console.log(user)
  } catch (error) {
    console.error(error)
  }
}
~~~

### 有依赖时串行

~~~js
const user = await fetchUser()
const projects = await fetchProjects(user.id)
~~~

### 无依赖时并行

~~~js
const userPromise = fetchUser()
const settingsPromise = fetchSettings()

const [user, settings] = await Promise.all([
  userPromise,
  settingsPromise,
])
~~~

## 四、核心原理

~~~text
调用 async 函数
→ 得到 Promise
→ 执行到 await 时暂停当前函数
→ Promise 完成后恢复
→ 继续执行或抛出异常
~~~

await value 会把普通值转换为已经完成的 Promise；如果等待的 Promise 失败，await 会抛出异常。

## 五、常见场景

- API 请求流程。
- 服务端读取数据库。
- 表单提交。
- 文件上传。
- 服务端组件中的数据获取。

## 六、踩坑点

1. async 函数的返回值永远是 Promise。
2. await 只暂停当前 async 函数。
3. 不要在循环中无意识地连续 await。
4. try/catch 只能捕获当前异步流程中真正传播到这里的错误。
5. 不要把服务端密钥放进客户端代码。

## 七、项目中的实际使用

把请求状态拆成明确状态：

~~~text
idle/loading → success
idle/loading → error
~~~

请求函数返回数据或抛出异常；页面或调用者负责显示加载、空数据、错误和重试。

## 八、一句话总结

async/await 只是 Promise 的易读写法；真正的工程判断仍然是依赖关系、并行边界和错误边界。

## 九、核心问答

### 1. async 函数返回什么？

始终返回 Promise，即使函数中直接返回普通值。

### 2. await 会阻塞浏览器吗？

不会，它只暂停当前 async 函数，其他任务仍可运行。

### 3. 什么时候不能直接连续 await？

当多个任务互不依赖时，连续 await 会让它们串行执行，应先启动后用 Promise.all 等待。

### 4. 为什么请求函数和页面状态应该分开？

请求函数处理数据和异常，页面处理展示状态，职责清晰且更容易复用和测试。

## 十、自测与答案

### 题目

1. async function f() { return 1 } 的返回值是什么？
2. 如何并行请求用户信息和配置？
3. await 失败时会发生什么？
4. 如何设计一个可重试的请求页面？

<details>
<summary>查看答案</summary>

1. 一个 fulfilled 的 Promise，结果为 1。
2. 同时调用两个函数，再用 Promise.all 等待。
3. 在当前 async 函数中抛出异常，由 try/catch 或上层处理。
4. 明确 loading、success、error 状态，在 error 状态提供重新请求入口。

</details>
