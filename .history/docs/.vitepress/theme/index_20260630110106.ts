import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import BlogList from './components/BlogList.vue'
import Comments from './components/Comments.vue'
import DocStats from './components/DocStats.vue'
import SiteStats from './components/SiteStats.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // 正文底部：单页阅读量
      'doc-footer-before': () => h(DocStats),
      // 正文之后：giscus 评论
      'doc-after': () => h(Comments),
      // 全站底部：站点访问量统计
      'layout-bottom': () => h(SiteStats)
    })
  },
  enhanceApp({ app }) {
    // 注册全局组件，供 Markdown 中直接使用 <BlogList />
    app.component('BlogList', BlogList)
  }
} satisfies Theme
