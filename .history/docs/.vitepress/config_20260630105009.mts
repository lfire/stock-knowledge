import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // GitHub Pages 项目站点的基础路径，对应仓库名 stock-knowledge
  // 若部署到 <user>.github.io 根仓库，请改为 '/'
  base: '/stock-knowledge/',

  lang: 'zh-CN',
  title: '股票知识库',
  description: '面向投资者的股票入门与进阶知识博客 —— 基础概念、技术分析、基本面分析与投资策略',

  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#e63946' }],
    ['meta', { name: 'keywords', content: '股票,投资,财经,技术分析,基本面分析,投资策略' }]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    siteTitle: '股票知识库',

    nav: [
      { text: '首页', link: '/' },
      { text: '基础知识', link: '/basics/what-is-stock' },
      { text: '分析方法', link: '/analysis/technical-analysis' },
      { text: '投资策略', link: '/strategy/value-investing' },
      { text: '博客文章', link: '/articles/' }
    ],

    sidebar: {
      '/basics/': [
        {
          text: '股票基础知识',
          items: [
            { text: '什么是股票', link: '/basics/what-is-stock' },
            { text: '股票市场概览', link: '/basics/stock-market' },
            { text: '常见交易术语', link: '/basics/terminology' }
          ]
        }
      ],
      '/analysis/': [
        {
          text: '分析方法',
          items: [
            { text: '技术分析入门', link: '/analysis/technical-analysis' },
            { text: '基本面分析', link: '/analysis/fundamental-analysis' },
            { text: '常用技术指标', link: '/analysis/indicators' }
          ]
        }
      ],
      '/strategy/': [
        {
          text: '投资策略',
          items: [
            { text: '价值投资', link: '/strategy/value-investing' },
            { text: '风险管理', link: '/strategy/risk-management' }
          ]
        }
      ],
      '/articles/': [
        {
          text: '博客文章',
          items: [
            { text: '文章列表', link: '/articles/' },
            { text: '新手如何开始第一笔投资', link: '/articles/first-investment' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-name/stock-knowledge' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: '本站内容仅供学习参考，不构成任何投资建议。投资有风险，入市需谨慎。',
      copyright: 'Copyright © 2026 股票知识库'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    outline: {
      label: '本页目录'
    },

    lastUpdatedText: '最后更新',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题'
  }
})
