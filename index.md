---
layout: home
title: 全栈工程学习笔记
titleTemplate: 从概念到实现，从实现到验证
description: 记录 Go 后端、数据结构与算法、前端工程、LLM/Agent 与 AI 辅助开发的长期学习路径。

hero:
  name: 全栈工程学习笔记
  text: 从概念到实现，从实现到验证
  tagline: 把学过的内容整理成可以解释、实现、测试、复盘和迁移的最小闭环。
  actions:
    - theme: brand
      text: 从学习路线开始
      link: /README
    - theme: alt
      text: 浏览 Go 笔记
      link: /go_note/Go语言简明教程

features:
  - icon: ◈
    title: 先建立概念模型
    details: 先说明问题、约束和核心不变量，再进入 API、代码和框架。
  - icon: ◎
    title: 用最小实现落地
    details: 把抽象知识压缩成可以运行、阅读和复现的最小例子。
  - icon: ✓
    title: 用验证闭环收口
    details: 通过测试、基准、实验和复盘，确认理解不是停留在记忆层面。
---

<script setup>
import { withBase } from 'vitepress'
</script>

<div class="home-intro">
  <div>
    <span class="eyebrow">CURRENT FOCUS</span>
    <h2>当前学习主线</h2>
    <p>先打牢 Go 语言、数据结构与算法，再进入 Web、ORM、缓存、RPC 和性能工程。</p>
  </div>
  <div class="route-grid">
    <a class="route-card" :href="withBase('/go_note/Go语言简明教程')">
      <span>01</span>
      <strong>Go 语言主干</strong>
      <small>值、错误、接口、并发与生命周期</small>
    </a>
    <a class="route-card" :href="withBase('/hello_go/hello-algo-数据结构笔记/README')">
      <span>02</span>
      <strong>数据结构与算法</strong>
      <small>从约束反推结构，再用练习验证</small>
    </a>
    <a class="route-card" :href="withBase('/go_note/Go-Gee框架高效笔记/00-总目录与学习路线')">
      <span>03</span>
      <strong>工程实践</strong>
      <small>HTTP、ORM、缓存、RPC 与服务治理</small>
    </a>
    <a class="route-card" :href="withBase('/go_note/Go语言高性能编程/Go语言高性能编程-总目录与最小闭环')">
      <span>04</span>
      <strong>性能与验证</strong>
      <small>测量、基准、并发治理与交付检查</small>
    </a>
  </div>
</div>

<div class="home-note">
  <strong>阅读建议</strong>
  <span>先看路线页，再按主题目录阅读；遇到暂时不会的内容，先记录问题和实验，不必一次读完所有章节。</span>
</div>
