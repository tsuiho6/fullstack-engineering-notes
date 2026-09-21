# Trie 路由与参数提取：从“查表”到“按路径结构匹配”

## 一、是什么

路由器把 `(HTTP method, URL path)` 映射到 Handler；动态路由还要把路径中的变量提取出来，例如 `/users/:id` 匹配 `/users/42`，得到 `id=42`。

Gee 用“按路径段组织的 Trie”替代单纯 map：每一层表示一个 path segment，节点保存静态段、参数段或通配段。

## 二、为什么需要

静态 map 只能精确查 `/hello`，无法自然表达 `/users/:id`、`/assets/*filepath`。如果把所有规则写成正则，规则优先级、参数提取和性能也容易失控。

Trie 的关键收益是：**路由模式的结构和匹配过程保持一致**。注册时建树，查找时沿 path segment 走树，并在命中时回填参数。

## 三、核心用法

### 1. 路由的最小数据结构（⭐）

```go
type node struct {
	pattern  string   // 只有完整规则节点保存，例如 /users/:id
	part     string   // 当前 path segment
	children []*node
	isWild   bool     // :id 或 *path
}

type router struct {
	roots    map[string]*node       // method -> root
	handlers map[string]HandlerFunc // method + "\x00" + pattern -> handler
}
```

注意形状：**method 隔离一棵根树；pattern 到 Handler 单独映射**。这样既不把 GET/POST 混在一起，也能从命中的完整 pattern 找到业务 Handler。

### 2. 注册和匹配的最小流程（⭐）

```text
注册：
pattern → 按 / 切成 segments → 插入 method 对应 Trie → 保存完整 pattern/handler

请求：
path → 按 / 切成 segments → 在 Trie 中优先尝试静态/参数/通配分支
     → 命中完整 pattern → 根据 pattern 对齐提取 params → 调用 handler
```

核心伪代码：

```go
parts := parsePattern("/users/:id") // ["users", ":id"]
node := root.search(parsePattern("/users/42"), 0)
// 命中后 params = map[string]string{"id": "42"}
```

### 3. 路由类型要分清

| 类型 | 示例 | 数据来源/特征 | 适合 |
|---|---|---|---|
| 静态路径 | `/healthz` | 完全固定 | 健康检查、固定资源 |
| 路径参数 | `/users/:id` 或 `/users/{id}` | URL 结构的一部分 | 资源标识、层级资源 |
| 通配路径 | `/assets/*filepath` 或 `/files/{path...}` | 吞掉剩余路径 | 静态文件、代理转发 |
| 查询参数 | `/search?q=go` | 不参与路径匹配 | 过滤、分页、排序 |

## 四、核心原理

### 1. 为什么需要回溯

`/users/new` 与 `/users/:id` 都可能匹配 `/users/new`。正确路由器通常优先尝试更具体的静态分支，失败后再尝试动态分支；否则可能把固定动作误当成资源 ID。

直观规则：**静态 > 单段参数 > 多段通配**。教程实现的 `matchChildren` 返回多个候选，是为了保留这个回溯空间。

### 2. 匹配复杂度

若路径有 `k` 个 segment，每层平均候选数为 `b`，朴素回溯最坏接近 `O(b^k)`；但真实路由通常分支很少，且静态分支优先。Trie 的主要收益是共享前缀，注册和查找不必扫描所有规则。

公式直观含义：路径越长、每一层可选分支越多，回溯越可能变贵；所以要控制规则冲突和通配符数量。

### 3. 通配符约束

`*filepath` 会吸收剩余所有 segments，因此通常必须是规则最后一段；如果允许中间出现多个 `*`，参数边界和优先级会变得不明确。

## 五、常见场景

- **必须理解**：REST 资源路由、版本路由、静态资源、参数提取、405/404 判断。
- **自研 Trie 适合**：学习框架机制、需要特殊匹配规则、可证明的性能/内存要求。
- **生产项目先考虑**：Go 1.22+ `http.ServeMux` 已支持 `GET /users/{id}` 和 `r.PathValue("id")`；一般项目不必为了普通路由自研 Trie。

标准库当前写法示例：

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	fmt.Fprintln(w, id)
})
```

## 六、踩坑点

1. **只用 `strings.HasPrefix` 代替路由匹配**：`/api` 会误匹配 `/apianything`，也无法提取参数。
2. **静态路由和参数路由优先级反了**：`/posts/latest` 不应被 `/posts/:id` 抢走。
3. **只按 path 不按 method**：POST 可能误调用 GET 的 Handler。
4. **把 query 当 path 参数**：`/users/42?id=7` 中 `42` 是 path，`7` 是 query，来源和语义不同。
5. **`*` 不限制在末尾**：会出现多个解释，匹配结果不稳定。
6. **忽略尾斜杠和转义**：`/users/42`、`/users/42/`、URL 编码后的 segment 是否等价，必须先定规则。
7. **运行时修改路由 map**：如果请求并发读取，启动后再注册会产生数据竞争；推荐启动期完成注册，之后只读。
8. **把 404 和 405 混为一谈**：路径不存在是 404；路径存在但 method 不允许通常应是 405，并带 `Allow`。

## 七、项目中的实际使用

路由注册阶段应做校验：

- pattern 是否以 `/` 开头；
- 参数名是否为空、是否重复；
- 通配符是否在末尾；
- 同 method + pattern 是否重复；
- 冲突规则是否能确定优先级。

请求处理阶段应返回结构化结果：

```go
type Match struct {
	Handler HandlerFunc
	Pattern string
	Params  map[string]string
}
```

不要让 Router 直接拼 JSON 或写大量业务错误；它只负责“找谁处理、带什么参数”，响应策略交给 Context/Handler 层。

## 八、一句话总结

**路由就是按 method 隔离、按 path 段匹配、按命中 pattern 提取参数；静态规则应优先于动态规则。**

## 九、核心问答

1. **Trie 相比 `map[path]handler` 解决了什么？**  
   支持共享前缀、动态参数和通配符，并把匹配过程变成按路径结构查找。

2. **为什么要按 method 保存 root？**  
   因为同一路径的不同 HTTP method 是不同操作，隔离后不会互相覆盖，也更容易得到 405。

3. **`/posts/latest` 和 `/posts/:id` 同时存在时怎么选？**  
   先选静态分支；这是可预测路由和避免歧义的核心规则。

4. **路径参数和查询参数有何区别？**  
   路径参数表达资源层级并参与路由匹配；查询参数表达筛选/分页等附加条件，通常由 `URL.Query()` 读取。

5. **什么时候不应该自己写 Trie？**  
   规则普通、性能未证实有瓶颈时；Go 1.22+ `ServeMux` 或成熟路由器已足够，自己维护会增加测试和安全成本。

## 十、自测与答案

### 题目

1. `/assets/*filepath` 请求 `/assets/css/app.css` 时，参数值应是什么？
2. 为什么路由 key 推荐使用 `method + "\x00" + pattern`，而不是直接用 `method + "-" + pattern`？
3. 对 `/users/new`，静态规则和 `:id` 规则都存在时，查找算法至少要保证什么？
4. `/api` 的分组如果仅用 `HasPrefix`，会误判什么路径？
5. 何时返回 404，何时返回 405？

<details>
<summary>展开答案</summary>

1. `css/app.css`，即通配符吸收剩余路径且通常不包含前缀 `/assets/`。
2. 使用不常见的分隔符可避免 pattern 本身包含 `-` 时产生歧义；更重要的是让 key 规则明确且统一。
3. 静态分支优先，只有静态分支失败时才尝试动态分支。
4. `/apianything` 等并非 `/api` 分组的路径。
5. 找不到任何 path 规则是 404；path 有匹配但 method 没注册是 405。

</details>

