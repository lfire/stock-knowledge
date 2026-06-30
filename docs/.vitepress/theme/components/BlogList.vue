<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../posts.data'

const ALL = '全部'
const activeTag = ref(ALL)

// 统计每个标签的文章数
const tagCounts = computed(() => {
  const counts: Record<string, number> = {}
  posts.forEach((p) => {
    p.tags.forEach((t) => {
      counts[t] = (counts[t] ?? 0) + 1
    })
  })
  return counts
})

const tags = computed(() => [ALL, ...Object.keys(tagCounts.value)])

const filteredPosts = computed(() =>
  activeTag.value === ALL
    ? posts
    : posts.filter((p) => p.tags.includes(activeTag.value))
)

function selectTag(tag: string) {
  activeTag.value = tag
}
</script>

<template>
  <div class="blog-list">
    <!-- 标签筛选 -->
    <div class="blog-tags-filter">
      <span
        v-for="tag in tags"
        :key="tag"
        class="blog-tag"
        :class="{ active: activeTag === tag }"
        @click="selectTag(tag)"
      >
        {{ tag }}
        <span v-if="tag !== ALL" class="count">{{ tagCounts[tag] }}</span>
        <span v-else class="count">{{ posts.length }}</span>
      </span>
    </div>

    <!-- 文章列表 -->
    <article
      v-for="post in filteredPosts"
      :key="post.url"
      class="blog-post"
    >
      <h2 class="blog-post-title">
        <a :href="withBase(post.url)">{{ post.title }}</a>
      </h2>
      <div class="blog-post-meta">
        <span>🗓️ {{ post.date.string }}</span>
        <span
          v-for="tag in post.tags"
          :key="tag"
          class="post-tag"
        >{{ tag }}</span>
      </div>
      <p v-if="post.excerpt" class="blog-post-excerpt">{{ post.excerpt }}</p>
    </article>

    <p v-if="filteredPosts.length === 0" class="blog-post-excerpt">
      该标签下暂无文章。
    </p>
  </div>
</template>
