import { hopeTheme } from "vuepress-theme-hope";

const page = (text: string, link: string) => ({ text, link });

const goWebPages = [
  page("总目录与学习路线", "/go_note/Go-Gee框架高效笔记/00-总目录与学习路线.md"),
  page("01 HTTP 入口与 Context", "/go_note/Go-Gee框架高效笔记/01-HTTP入口与Context.md"),
  page("02 Trie 路由与参数提取", "/go_note/Go-Gee框架高效笔记/02-Trie路由与参数提取.md"),
  page("03 路由分组与复用", "/go_note/Go-Gee框架高效笔记/03-路由分组与复用.md"),
  page("04 中间件与洋葱模型", "/go_note/Go-Gee框架高效笔记/04-中间件与洋葱模型.md"),
  page("05 模板与静态资源", "/go_note/Go-Gee框架高效笔记/05-模板与静态资源.md"),
  page("06 Panic 恢复与健壮性", "/go_note/Go-Gee框架高效笔记/06-Panic恢复与健壮性.md"),
  page("07 项目推荐写法与验证清单", "/go_note/Go-Gee框架高效笔记/07-项目推荐写法与验证清单.md"),
  page("08 跨章节综合问答与复习计划", "/go_note/Go-Gee框架高效笔记/08-跨章节综合问答与复习计划.md"),
];

const goOrmPages = [
  page("总目录与最小闭环", "/go_note/Go-GeeORM高效笔记/00-总目录与最小闭环.md"),
  page("01 database/sql：数据库交互地基", "/go_note/Go-GeeORM高效笔记/01-数据库交互地基-database-sql.md"),
  page("02 对象表映射：Schema 与 Dialect", "/go_note/Go-GeeORM高效笔记/02-对象表映射-Schema与Dialect.md"),
  page("03 Clause 与 CRUD：从结构体到 SQL", "/go_note/Go-GeeORM高效笔记/03-Clause与CRUD-从结构体到SQL.md"),
  page("04 链式查询与安全更新删除", "/go_note/Go-GeeORM高效笔记/04-链式查询与安全更新删除.md"),
  page("05 Hooks 与生命周期扩展", "/go_note/Go-GeeORM高效笔记/05-Hooks与生命周期扩展.md"),
  page("06 Transaction 事务与错误回滚", "/go_note/Go-GeeORM高效笔记/06-Transaction事务与错误回滚.md"),
  page("07 Migrate 迁移与版本演进", "/go_note/Go-GeeORM高效笔记/07-Migrate迁移与版本演进.md"),
  page("08 项目推荐写法与验证清单", "/go_note/Go-GeeORM高效笔记/08-项目推荐写法与验证清单.md"),
  page("09 跨章节综合问答与复习计划", "/go_note/Go-GeeORM高效笔记/09-跨章节综合问答与复习计划.md"),
];

const geeCachePages = [
  page("总目录与最小闭环", "/go_note/GeeCache高效笔记/00-总目录与最小闭环.md"),
  page("01 LRU 与缓存淘汰", "/go_note/GeeCache高效笔记/01-LRU与缓存淘汰.md"),
  page("02 单机并发缓存与 Group", "/go_note/GeeCache高效笔记/02-单机并发缓存与Group.md"),
  page("03 HTTP 节点服务", "/go_note/GeeCache高效笔记/03-HTTP节点服务.md"),
  page("04 一致性哈希与节点选择", "/go_note/GeeCache高效笔记/04-一致性哈希与节点选择.md"),
  page("05 分布式节点与远程回源", "/go_note/GeeCache高效笔记/05-分布式节点与远程回源.md"),
  page("06 singleflight 与缓存问题", "/go_note/GeeCache高效笔记/06-singleflight与缓存问题.md"),
  page("07 Protobuf 与节点间协议", "/go_note/GeeCache高效笔记/07-Protobuf与节点间协议.md"),
  page("08 项目推荐写法与验证清单", "/go_note/GeeCache高效笔记/08-项目推荐写法与验证清单.md"),
  page("09 跨章节综合问答与复习计划", "/go_note/GeeCache高效笔记/09-跨章节综合问答与复习计划.md"),
];

const geeRpcPages = [
  page("总目录与最小闭环", "/go_note/GeeRPC高效笔记/00-总目录与最小闭环.md"),
  page("01 RPC 模型与消息协议", "/go_note/GeeRPC高效笔记/01-RPC模型与消息协议.md"),
  page("02 服务端与编解码闭环", "/go_note/GeeRPC高效笔记/02-服务端与编解码闭环.md"),
  page("03 服务注册与反射调用", "/go_note/GeeRPC高效笔记/03-服务注册与反射调用.md"),
  page("04 客户端并发与异步调用", "/go_note/GeeRPC高效笔记/04-客户端并发与异步调用.md"),
  page("05 超时取消与错误边界", "/go_note/GeeRPC高效笔记/05-超时取消与错误边界.md"),
  page("06 HTTP 传输适配", "/go_note/GeeRPC高效笔记/06-HTTP传输适配.md"),
  page("07 服务发现与负载均衡", "/go_note/GeeRPC高效笔记/07-服务发现与负载均衡.md"),
  page("08 注册中心与心跳", "/go_note/GeeRPC高效笔记/08-注册中心与心跳.md"),
  page("09 项目推荐写法与验证清单", "/go_note/GeeRPC高效笔记/09-项目推荐写法与验证清单.md"),
  page("10 跨章节综合问答与复习计划", "/go_note/GeeRPC高效笔记/10-跨章节综合问答与复习计划.md"),
];

const goInterviewPages = [
  page("总目录与学习路线", "/go_note/Go语言笔试面试题/00-总目录与学习路线.md"),
  page("01 语言基础：声明、常量、错误与轻量语法", "/go_note/Go语言笔试面试题/01-语言基础-声明常量错误与轻量语法.md"),
  page("02 值模型：字符串、指针、接口、方法集与逃逸", "/go_note/Go语言笔试面试题/02-值模型-字符串指针接口方法集与逃逸.md"),
  page("03 程序生命周期：init、defer 与输出题", "/go_note/Go语言笔试面试题/03-程序生命周期-init-defer与输出题.md"),
  page("04 并发：channel、goroutine 泄漏与 GOMAXPROCS", "/go_note/Go语言笔试面试题/04-并发-channel泄漏与GOMAXPROCS.md"),
  page("05 最小项目闭环与综合复习", "/go_note/Go语言笔试面试题/05-最小项目闭环与综合复习.md"),
  page("06 切片与 map：数据容器", "/go_note/Go语言笔试面试题/06-切片与map-数据容器.md"),
  page("07 接口、方法集与反射", "/go_note/Go语言笔试面试题/07-接口方法集与反射.md"),
  page("08 channel 与并发闭环", "/go_note/Go语言笔试面试题/08-channel与并发闭环.md"),
  page("09 context 与并发工程", "/go_note/Go语言笔试面试题/09-context与并发工程.md"),
  page("10 编译、逃逸与工具链", "/go_note/Go语言笔试面试题/10-编译逃逸与工具链.md"),
  page("11 G-P-M 调度器", "/go_note/Go语言笔试面试题/11-GPM调度器.md"),
  page("12 GC、内存与性能", "/go_note/Go语言笔试面试题/12-GC内存与性能.md"),
  page("13 unsafe 深水区", "/go_note/Go语言笔试面试题/13-unsafe深水区.md"),
  page("14 跨章节综合问答", "/go_note/Go语言笔试面试题/14-跨章节综合问答.md"),
];

const dataStructurePages = [
  page("数据结构总览", "/hello_go/hello-algo-数据结构笔记/README.md"),
  page("00 总目录与学习顺序", "/hello_go/hello-algo-数据结构笔记/00-总目录与学习顺序.md"),
  page("01 基础分类与 Go 语义", "/hello_go/hello-algo-数据结构笔记/01-基础分类与Go语义.md"),
  page("02 数组、切片与链表", "/hello_go/hello-algo-数据结构笔记/02-数组切片与链表.md"),
  page("03 栈、队列与双端队列", "/hello_go/hello-algo-数据结构笔记/03-栈队列与双端队列.md"),
  page("04 哈希表", "/hello_go/hello-algo-数据结构笔记/04-哈希表.md"),
  page("05 树与遍历", "/hello_go/hello-algo-数据结构笔记/05-树与遍历.md"),
  page("06 堆与优先队列", "/hello_go/hello-algo-数据结构笔记/06-堆与优先队列.md"),
  page("07 图与遍历", "/hello_go/hello-algo-数据结构笔记/07-图与遍历.md"),
  page("08 跨章节综合问答", "/hello_go/hello-algo-数据结构笔记/08-跨章节综合问答.md"),
];

const algorithmPages = [
  page("算法总览", "/hello_go/hello-algo-算法高效笔记/README.md"),
  page("00 总目录与学习顺序", "/hello_go/hello-algo-算法高效笔记/00-总目录与学习顺序.md"),
  page("01 二分查找", "/hello_go/hello-algo-算法高效笔记/01-二分查找.md"),
  page("02 排序", "/hello_go/hello-algo-算法高效笔记/02-排序.md"),
  page("03 分治", "/hello_go/hello-algo-算法高效笔记/03-分治.md"),
  page("04 回溯", "/hello_go/hello-algo-算法高效笔记/04-回溯.md"),
  page("05 动态规划", "/hello_go/hello-algo-算法高效笔记/05-动态规划.md"),
  page("06 贪心", "/hello_go/hello-algo-算法高效笔记/06-贪心.md"),
  page("07 跨章节综合问答", "/hello_go/hello-algo-算法高效笔记/07-跨章节综合问答.md"),
];

const frontEndCorePages = [
  page("学习路线", "/前端与全栈/README.md"),
  page("JavaScript 基础", "/前端与全栈/01-JavaScript基础/README.md"),
  page("TypeScript", "/前端与全栈/02-TypeScript/README.md"),
  page("React", "/前端与全栈/03-React/README.md"),
  page("Next.js 总览", "/前端与全栈/04-Next.js/README.md"),
];

const nextCorePages = [
  page("00 心智模型与学习路线", "/前端与全栈/04-Next.js/00-心智模型与学习路线.md"),
  page("01 App Router 与 app 目录", "/前端与全栈/04-Next.js/01-App-Router与app目录.md"),
  page("02 page、layout 与动态路由", "/前端与全栈/04-Next.js/02-page-layout与动态路由.md"),
  page("03 Server 与 Client 组件", "/前端与全栈/04-Next.js/03-Server与Client组件.md"),
  page("04 数据获取、缓存与重新验证", "/前端与全栈/04-Next.js/04-数据获取缓存与重新验证.md"),
  page("05 加载、错误、404 与流式渲染", "/前端与全栈/04-Next.js/05-加载错误404与流式渲染.md"),
  page("06 Route Handlers 与 Server Actions", "/前端与全栈/04-Next.js/06-Route-Handlers与Server-Actions.md"),
];

const fullStackPages = [
  page("07 表单、认证、授权与环境变量", "/前端与全栈/04-Next.js/07-表单认证授权与环境变量.md"),
  page("08 PostgreSQL 与数据访问层", "/前端与全栈/04-Next.js/08-PostgreSQL与数据访问层.md"),
  page("09 部署与生产环境", "/前端与全栈/04-Next.js/09-部署与生产环境.md"),
  page("10 AI 流式响应", "/前端与全栈/04-Next.js/10-AI流式响应.md"),
  page("11 项目最小闭环", "/前端与全栈/04-Next.js/11-项目最小闭环.md"),
  page("12 跨章节综合问答", "/前端与全栈/04-Next.js/12-跨章节综合问答.md"),
  page("当前版本缓存 API 补充", "/前端与全栈/04-Next.js/补充-当前版本缓存API.md"),
];
const goBasicsSections = [
  {
    text: "网络与 HTTP",
    collapsible: true,
    children: [
      page("章节总览", "/Go后端基本功/01-网络与HTTP/README.md"),
      page("01 请求链路", "/Go后端基本功/01-网络与HTTP/01-请求链路.md"),
      page("02 HTTP 语义与连接", "/Go后端基本功/01-网络与HTTP/02-HTTP语义与连接.md"),
      page("03 Go 网络调用与排障", "/Go后端基本功/01-网络与HTTP/03-Go网络调用与排障.md"),
    ],
  },
  {
    text: "业务 API",
    collapsible: true,
    children: [
      page("章节总览", "/Go后端基本功/02-业务API/README.md"),
      page("01 资源与 HTTP 语义", "/Go后端基本功/02-业务API/01-资源与HTTP语义.md"),
      page("02 Go Handler 与分层", "/Go后端基本功/02-业务API/02-GoHandler与分层.md"),
      page("03 错误、权限与幂等", "/Go后端基本功/02-业务API/03-错误权限幂等与闭环.md"),
    ],
  },
  {
    text: "Go 测试",
    collapsible: true,
    children: [
      page("章节总览", "/Go后端基本功/03-Go测试/README.md"),
      page("01 测试结构与表驱动", "/Go后端基本功/03-Go测试/01-测试结构与表驱动.md"),
      page("02 Handler 测试与依赖隔离", "/Go后端基本功/03-Go测试/02-Handler测试与依赖隔离.md"),
      page("03 集成、竞态与验证闭环", "/Go后端基本功/03-Go测试/03-集成竞态与验证闭环.md"),
    ],
  },
  {
    text: "Linux",
    collapsible: true,
    children: [
      page("章节总览", "/Go后端基本功/04-Linux/README.md"),
      page("01 Shell、文件与权限", "/Go后端基本功/04-Linux/01-Shell文件与权限.md"),
      page("02 进程、服务与日志", "/Go后端基本功/04-Linux/02-进程服务与日志.md"),
      page("03 资源、网络与排障", "/Go后端基本功/04-Linux/03-资源网络与故障排查.md"),
    ],
  },
  {
    text: "Git",
    collapsible: true,
    children: [
      page("章节总览", "/Go后端基本功/05-Git/README.md"),
      page("01 快照、暂存区与提交", "/Go后端基本功/05-Git/01-快照暂存区与日常提交.md"),
      page("02 分支、合并与冲突", "/Go后端基本功/05-Git/02-分支合并与冲突.md"),
      page("03 远端协作与安全撤销", "/Go后端基本功/05-Git/03-远端协作与安全撤销.md"),
    ],
  },
];
export default hopeTheme({
  hostname: "https://tsuiho6.github.io/fullstack-engineering-notes/",
  logo: "/cow-icon.png",
  repo: "tsuiho6/fullstack-engineering-notes",
  docsDir: "/",
  author: "tsuiho6",
  pure: true,
  breadcrumb: true,
  lastUpdated: true,
  contributors: false,
  pageInfo: ["Author", "Date", "ReadingTime"],
  navbar: [
    { text: "学习路线", link: "/" },
    { text: "前端与全栈", link: "/前端与全栈/README.md" },
    { text: "Go 语言基础", link: "/go_note/Go语言简明教程.md" },
    { text: "Go 后端基本功", link: "/Go后端基本功/README.md" },
    { text: "Go 框架实践", link: "/go_note/Go-Gee框架高效笔记/00-总目录与学习路线.md" },
    {
      text: "Go 面试复习",
      link: "/go_note/Go语言笔试面试题/00-总目录与学习路线.md",
    },
    { text: "数据结构与算法", link: "/hello_go/hello-algo-数据结构笔记/README.md" },
  ],
  sidebar: {
    "/": [
      {
        text: "开始阅读",
        children: [page("学习路线总览", "/")],
      },
      {
        text: "前端与全栈",
        collapsible: true,
        children: [
          ...frontEndCorePages,
          {
            text: "Next.js 核心",
            collapsible: true,
            children: nextCorePages,
          },
          {
            text: "全栈与 AI 扩展",
            collapsible: true,
            children: fullStackPages,
          },
        ],
      },
      {
        text: "Go 语言基础",
        collapsible: true,
        children: [page("Go 语言简明教程", "/go_note/Go语言简明教程.md")],
      },
      {
        text: "Go 后端基本功",
        collapsible: true,
        children: [
          page("总目录与最小闭环", "/Go后端基本功/README.md"),
          ...goBasicsSections,
        ],
      },
      {
        text: "Go 高性能编程",
        collapsible: true,
        children: [
          page("Go 高性能编程：总目录", "/go_note/Go语言高性能编程/Go语言高性能编程-总目录与最小闭环.md"),
          page("01 性能分析与性能实验", "/go_note/Go语言高性能编程/01-性能分析与性能实验.md"),
          page("02 数据结构与内存局部性", "/go_note/Go语言高性能编程/02-数据结构与内存局部性.md"),
          page("03 并发与资源治理", "/go_note/Go语言高性能编程/03-并发与资源治理.md"),
          page("04 编译器优化与交付", "/go_note/Go语言高性能编程/04-编译器优化与交付.md"),
        ],
      },
      {
        text: "Go 项目实战",
        collapsible: true,
        children: [
          { text: "Gee Web 框架", collapsible: true, children: goWebPages },
          { text: "GeeORM", collapsible: true, children: goOrmPages },
          { text: "GeeCache", collapsible: true, children: geeCachePages },
          { text: "GeeRPC", collapsible: true, children: geeRpcPages },
        ],
      },
      {
        text: "Go 面试复习",
        collapsible: true,
        children: goInterviewPages,
      },
      {
        text: "数据结构与算法",
        collapsible: true,
        children: [
          { text: "数据结构", collapsible: true, children: dataStructurePages },
          { text: "算法", collapsible: true, children: algorithmPages },
        ],
      },
    ],
  },
  plugins: {
    readingTime: {
      wordPerMinute: 300,
    },
  },
});
