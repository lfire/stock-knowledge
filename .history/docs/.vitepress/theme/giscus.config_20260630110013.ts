/**
 * giscus 评论配置
 *
 * 启用步骤：
 * 1. 在 GitHub 仓库的 Settings → General → Features 中开启 Discussions。
 * 2. 安装 giscus App：https://github.com/apps/giscus
 * 3. 打开 https://giscus.app/zh-CN ，填入你的仓库，选择 Discussion 分类，
 *    页面会生成 data-repo / data-repo-id / data-category / data-category-id。
 * 4. 将下面的占位值替换为你自己的值即可启用评论。
 *
 * 在替换前，站点会在文章底部显示「评论未配置」的提示，不影响其他功能。
 */
export const giscusConfig = {
  repo: 'your-name/stock-knowledge',
  repoId: 'YOUR_REPO_ID',
  category: 'Announcements',
  categoryId: 'YOUR_CATEGORY_ID',
  mapping: 'pathname',
  lang: 'zh-CN'
}

/** 判断 giscus 是否已正确配置（未替换占位值时返回 false） */
export function isGiscusEnabled(): boolean {
  return (
    !!giscusConfig.repo &&
    !giscusConfig.repo.startsWith('your-name/') &&
    giscusConfig.repoId !== 'YOUR_REPO_ID' &&
    giscusConfig.categoryId !== 'YOUR_CATEGORY_ID'
  )
}
