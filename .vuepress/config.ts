import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

const base = process.env.DOCS_BASE ?? "/";

export default defineUserConfig({
  base,
  lang: "zh-CN",
  title: "全栈工程学习笔记",
  description: "记录全栈工程学习路径与实践验证。",
  bundler: viteBundler(),
  theme,
  pagePatterns: [
    "**/*.md",
    "!**/node_modules/**",
    "!.vuepress",
    "!README.md",
  ],
});
