<script setup lang="ts">
/**
 * 数据管理组件
 * 提供数据相关的管理功能，如清除对话记录等
 */
import { useChatStore } from '@/stores/chat'
import { confirmAction } from '@/utils/dialog'

// 获取聊天 Store
const { deleteAllConversations } = useChatStore()

/**
 * 处理删除所有对话
 * 先弹出确认对话框，确认后执行删除操作
 */
const handleDeleteAllConversations = async () => {
  const ok = await confirmAction({
    message: '确定要删除所有对话吗？此操作不可恢复。',
    confirmText: '删除',
  })
  if (ok) deleteAllConversations()
}
</script>

<template>
  <div>
    <div class="data-value">
      <span>清除所有对话记录</span>
      <el-button type="danger" size="small" @click="handleDeleteAllConversations">
        删除
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.data-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--text-color);
}
</style>
