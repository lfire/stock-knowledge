import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import BlogList from './components/BlogList.vue'
import Comments from './components/Comments.vue'
import DocStats from './components/DocStats.vue'
import SiteStats from './components/SiteStats.vue'
import PostMeta from './components/PostMeta.vue'
import StockChart from './components/StockChart.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // 正文标题下方：文章发布时间等元信息
      'doc-before': () => h(PostMeta),
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
    // K 线 / 趋势图表组件，供形态分析文章使用 <StockChart />
    app.component('StockChart', StockChart)
  }
} satisfies Theme
