<script setup lang="ts">
/**
 * 对话列表组件
 * 负责展示所有对话，按置顶/最近分组渲染，支持重命名、置顶、删除操作
 */
import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'
import type { Conversation } from '@/types'
import ConversationItem from './ConversationItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { confirmAction } from '@/utils/dialog'

// 聊天 Store
const chatStore = useChatStore()
const { conversations, sortedConversations, activeConversationId } = storeToRefs(chatStore)
const { renameConversation, pinConversation, unpinConversation, deleteConversation } = chatStore

/**
 * 分组列表：将对话按置顶/最近分组，插入标题和分隔线
 * 返回统一渲染数组 [{ type: 'header'|'item'|'divider', ... }]
 * - 置顶组有数据时：标题 "置顶" → 对话项列表 → 分隔线（如果也有最近组）
 * - 最近组有数据时：标题 "最近" → 对话项列表
 */
const groups = computed(() => {
  const pinned = sortedConversations.value.filter((c: Conversation) => c.isPinned)
  const unpinned = sortedConversations.value.filter((c: Conversation) => !c.isPinned)
  const items: Array<{
    type: 'header' | 'item' | 'divider'
    title?: string
    conversation?: Conversation
  }> = []

  if (pinned.length > 0) {
    items.push({ type: 'header', title: '置顶' })
    pinned.forEach((c) => items.push({ type: 'item', conversation: c }))
  }

  if (unpinned.length > 0) {
    if (pinned.length > 0) items.push({ type: 'divider' })
    items.push({ type: 'header', title: '最近' })
    unpinned.forEach((c) => items.push({ type: 'item', conversation: c }))
  }

  return items
})

// 删除对话（含确认弹窗）
const handleDelete = async (id: string) => {
  const ok = await confirmAction({
    message: '确定要删除这个对话吗？此操作不可恢复。',
    confirmText: '删除',
  })
  if (ok) deleteConversation(id)
}
</script>

<template>
  <div class="conversation-list">
    <EmptyState
      v-if="conversations.length === 0"
      title="暂无对话"
      hint="点击上方按钮或发送消息创建新对话"
    />

    <template v-else>
      <template v-for="item in groups" :key="item.conversation?.id || item.title">
        <div v-if="item.type === 'divider'" class="section-divider" />
        <div v-else-if="item.type === 'header'" class="section-title">{{ item.title }}</div>
        <ConversationItem
          v-else-if="item.conversation"
          :conversation="item.conversation"
          :is-active="item.conversation.id === activeConversationId"
          @select="(id: string) => (activeConversationId = id)"
          @rename="renameConversation"
          @pin="pinConversation"
          @unpin="unpinConversation"
          @delete="handleDelete"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.conversation-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  padding: 8px 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}
</style>
