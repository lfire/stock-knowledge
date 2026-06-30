<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { useData, useRoute } from 'vitepress'

const { frontmatter } = useData()
const route = useRoute()
const el = ref<HTMLElement | null>(null)

const dateStr = computed(() => {
  const raw = frontmatter.value.date
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(+d)) return ''
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const author = computed<string>(() => frontmatter.value.author ?? '')
const tags = computed<string[]>(() => frontmatter.value.tags ?? [])

// 将发布信息条移动到正文 H1 标题的正下方
function moveAfterTitle() {
  if (!el.value) return
  const h1 = document.querySelector('.vp-doc h1')
  if (h1) {
    h1.insertAdjacentElement('afterend', el.value)
  }
}

onMounted(() => nextTick(moveAfterTitle))
// 路由切换后，重新定位到新页面的标题下方
watch(
  () => route.path,
  () => nextTick(moveAfterTitle)
)
</script>

<template>
  <!-- 根节点始终存在，仅当有发布日期时显示内容，避免移动后被销毁报错 -->
  <div ref="el" class="post-meta-bar" :class="{ 'is-empty': !dateStr }">
    <template v-if="dateStr">
      <span class="post-meta-item">🗓️ 发布于 {{ dateStr }}</span>
      <span v-if="author" class="post-meta-item">✍️ {{ author }}</span>
      <span v-for="tag in tags" :key="tag" class="post-meta-tag">{{ tag }}</span>
    </template>
  </div>
</template>
