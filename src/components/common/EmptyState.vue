<script setup lang="ts">
/**
 * 空状态占位组件
 * 用于列表无数据、搜索无结果等场景，显示标题和可选的提示文案
 */
defineProps<{
  // 主标题
  title: string
  // 副提示（可选）
  hint?: string
}>()
</script>

<template>
  <div class="empty-state">
    <p>{{ title }}</p>
    <span v-if="hint" class="empty-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
}
</style>
