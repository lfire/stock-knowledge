<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import { loadVercount } from '../stats'

const route = useRoute()

onMounted(() => nextTick(loadVercount))
// 路由切换后重新加载脚本，刷新当前页与站点计数
watch(
  () => route.path,
  () => nextTick(loadVercount)
)
</script>

<template>
  <div class="site-stats">
    <span>本站总访问量 <span id="vercount_value_site_pv">--</span> 次</span>
    <span>总访客数 <span id="vercount_value_site_uv">--</span> 人</span>
  </div>
</template>
