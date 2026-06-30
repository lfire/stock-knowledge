/**
 * 访问量统计 —— 基于 vercount（兼容不蒜子 DOM id，无需注册、无需服务器）
 * 文档：https://vercount.one
 *
 * 页面中放置以下元素即可自动填充：
 *  - 站点总访问量： id="vercount_value_site_pv"
 *  - 站点访客数：   id="vercount_value_site_uv"
 *  - 当前页阅读量： id="vercount_value_page_pv"
 *
 * VitePress 是单页应用，路由切换后需要重新加载脚本以刷新计数。
 */
const SCRIPT_ID = 'vercount-script'
const SCRIPT_SRC = 'https://cn.vercount.one/js'

export function loadVercount(): void {
  if (typeof document === 'undefined') return
  // 移除旧脚本，重新插入以触发当前页面的统计刷新
  document.getElementById(SCRIPT_ID)?.remove()
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.defer = true
  script.src = SCRIPT_SRC
  document.body.appendChild(script)
}
