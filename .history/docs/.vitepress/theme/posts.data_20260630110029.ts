import { createContentLoader } from 'vitepress'

export interface Post {
  title: string
  url: string
  excerpt: string
  tags: string[]
  date: {
    time: number
    string: string
  }
}

declare const data: Post[]
export { data }

export default createContentLoader('articles/*.md', {
  transform(raw): Post[] {
    return raw
      // 仅保留含 date 的文章，排除列表页 index.md
      .filter((page) => page.frontmatter.date && page.url !== '/articles/')
      .map((page) => ({
        title: page.frontmatter.title ?? '未命名文章',
        url: page.url,
        excerpt: page.frontmatter.description ?? '',
        tags: page.frontmatter.tags ?? [],
        date: formatDate(page.frontmatter.date)
      }))
      .sort((a, b) => b.date.time - a.date.time)
  }
})

function formatDate(raw: string | Date): Post['date'] {
  const date = new Date(raw)
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}
