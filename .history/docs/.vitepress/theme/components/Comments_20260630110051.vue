<script setup lang="ts">
import { onMounted, watch, nextTick, ref } from 'vue'
import { useData, useRoute } from 'vitepress'
import { giscusConfig, isGiscusEnabled } from '../giscus.config'

const { isDark } = useData()
const route = useRoute()
const container = ref<HTMLElement | null>(null)
const enabled = isGiscusEnabled()

const GISCUS_ORIGIN = 'https://giscus.app'

function currentTheme(): string {
  return isDark.value ? 'dark' : 'light'
}

function renderGiscus() {
  if (!enabled || !container.value) return
  container.value.innerHTML = ''
  const script = document.createElement('script')
  script.src = `${GISCUS_ORIGIN}/client.js`
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-repo', giscusConfig.repo)
  script.setAttribute('data-repo-id', giscusConfig.repoId)
  script.setAttribute('data-category', giscusConfig.category)
  script.setAttribute('data-category-id', giscusConfig.categoryId)
  script.setAttribute('data-mapping', giscusConfig.mapping)
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', currentTheme())
  script.setAttribute('data-lang', giscusConfig.lang)
  container.value.appendChild(script)
}

// 切换深色模式时，向 giscus iframe 发送主题更新消息
function updateGiscusTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: currentTheme() } } },
    GISCUS_ORIGIN
  )
}

onMounted(renderGiscus)
watch(isDark, updateGiscusTheme)
// 路由切换后重新渲染评论（按 pathname 映射到不同 Discussion）
watch(
  () => route.path,
  () => nextTick(renderGiscus)
)
</script>

<template>
  <div class="giscus-comments">
    <h3>💬 评论</h3>
    <div v-if="enabled" ref="container" />
    <p v-else class="giscus-tip">
      评论功能尚未配置。请在
      <code>docs/.vitepress/theme/giscus.config.ts</code>
      中填入你的 giscus 参数后即可启用（详见 README）。
    </p>
  </div>
</template>
