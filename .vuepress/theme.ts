import { hopeTheme } from "vuepress-theme-hope";

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
    { text: "Go 工程", link: "/go_note/Go语言简明教程.md" },
    {
      text: "Go 面试主干",
      link: "/go_note/Go语言笔试面试题/00-总目录与学习路线.md",
    },
    { text: "数据结构与算法", link: "/hello_go/hello-algo-数据结构笔记/README.md" },
  ],
  sidebar: {
    "/": [
      {
        text: "开始阅读",
        children: ["/"],
      },
      {
        text: "Go 基础与工程",
        prefix: "/go_note/",
        collapsible: true,
        children: [
          "Go语言简明教程.md",
          "Go语言高性能编程/Go语言高性能编程-总目录与最小闭环.md",
          "Go-Gee框架高效笔记/00-总目录与学习路线.md",
          "Go-GeeORM高效笔记/00-总目录与最小闭环.md",
          "GeeCache高效笔记/00-总目录与最小闭环.md",
          "GeeRPC高效笔记/00-总目录与最小闭环.md",
        ],
      },
      {
        text: "Go 面试主干：核心主干 + 最小闭环",
        prefix: "/go_note/Go语言笔试面试题/",
        collapsible: true,
        children: [
          "00-总目录与学习路线.md",
          "01-语言基础-声明常量错误与轻量语法.md",
          "02-值模型-字符串指针接口方法集与逃逸.md",
          "03-程序生命周期-init-defer与输出题.md",
          "04-并发-channel泄漏与GOMAXPROCS.md",
          "05-最小项目闭环与综合复习.md",
          "06-切片与map-数据容器.md",
          "07-接口方法集与反射.md",
          "08-channel与并发闭环.md",
          "09-context与并发工程.md",
          "10-编译逃逸与工具链.md",
          "11-GPM调度器.md",
          "12-GC内存与性能.md",
          "13-unsafe深水区.md",
          "14-跨章节综合问答.md",
        ],
      },
      {
        text: "数据结构与算法",
        prefix: "/hello_go/",
        collapsible: true,
        children: [
          "hello-algo-数据结构笔记/README.md",
          "hello-algo-算法高效笔记/README.md",
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
