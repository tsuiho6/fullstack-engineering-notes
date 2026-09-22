import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE ?? '/'

export default defineConfig({
  lang: 'zh-CN',
  title: '全栈工程学习笔记',
  description: '记录全栈工程学习路径与实践验证。',
  base,
  lastUpdated: true,
  cleanUrls: false,
  appearance: true,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: '全栈工程学习笔记',
    nav: [
      { text: '学习路线', link: '/README' },
      { text: 'Go 工程', link: '/go_note/Go语言简明教程' },
      { text: 'Go 面试主干', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/00-总目录与学习路线' },
      { text: '数据结构与算法', link: '/hello_go/hello-algo-数据结构笔记/README' },
      { text: 'GitHub', link: 'https://github.com/tsuiho6/fullstack-engineering-notes' },
    ],
    sidebar: {
      '/go_note/': [
        {
          text: 'Go 基础与工程',
          items: [
            { text: 'Go 语言简明教程', link: '/go_note/Go语言简明教程' },
            { text: 'Go 高性能编程', link: '/go_note/Go语言高性能编程/Go语言高性能编程-总目录与最小闭环' },
            { text: 'Go Web 框架', link: '/go_note/Go-Gee框架高效笔记/00-总目录与学习路线' },
            { text: 'Go ORM', link: '/go_note/Go-GeeORM高效笔记/00-总目录与最小闭环' },
            { text: '分布式缓存', link: '/go_note/GeeCache高效笔记/00-总目录与最小闭环' },
            { text: 'RPC 与服务治理', link: '/go_note/GeeRPC高效笔记/00-总目录与最小闭环' },
            {
              text: 'Go 面试主干：核心主干 + 最小闭环',
              collapsed: false,
              items: [
                { text: '总目录与学习路线', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/00-总目录与学习路线' },
                { text: '切片与 map：数据容器', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/01-切片与map-数据容器' },
                { text: '接口、方法集与反射', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/02-接口方法集与反射' },
                { text: 'channel 与并发闭环', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/03-channel与并发闭环' },
                { text: 'context 与并发工程', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/04-context与并发工程' },
                { text: '编译、逃逸与工具链', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/05-编译逃逸与工具链' },
                { text: 'G-P-M 调度器', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/06-GPM调度器' },
                { text: 'GC、内存与性能', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/07-GC内存与性能' },
                { text: 'unsafe 深水区', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/08-unsafe深水区' },
                { text: '跨章节综合问答', link: '/go_note/Go程序员面试笔试宝典-高效复习笔记/09-跨章节综合问答' },
              ],
            },
            { text: 'Go 面试复习', link: '/go_note/Go语言笔试面试题/00-总目录与学习路线' },
          ],
        },
      ],
      '/hello_go/': [
        {
          text: '数据结构与算法',
          items: [
            { text: '数据结构笔记', link: '/hello_go/hello-algo-数据结构笔记/README' },
            { text: '算法笔记', link: '/hello_go/hello-algo-算法高效笔记/README' },
          ],
        },
      ],
      '/': [
        {
          text: '开始阅读',
          items: [{ text: '学习路线总览', link: '/README' }],
        },
      ],
    },
    outline: [2, 3],
    outlineTitle: '本页目录',
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    lastUpdatedText: '最后更新于',
    editLink: {
      pattern: 'https://github.com/tsuiho6/fullstack-engineering-notes/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tsuiho6/fullstack-engineering-notes' },
    ],
    footer: {
      message: '持续学习，持续验证。',
      copyright: '个人学习整理 · 内容版权归原作者及对应项目所有',
    },
  },
})
