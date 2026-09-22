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
          "Go语言笔试面试题/00-总目录与学习路线.md",
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
