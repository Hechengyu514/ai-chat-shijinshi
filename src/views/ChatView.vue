<script setup lang="ts">
/**
 * 聊天主页面
 * 提供 AI 对话界面，支持消息发送、显示和流式回复
 */
import AppLayout from '@/layout/AppLayout.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import nortonAvatar from '@/assets/images/Norton.png'
import { useChatStore } from '@/stores/chat'
import { chatApi } from '@/api/chat'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Message } from '@/types'
import { storeToRefs } from 'pinia'
import { useAutoScroll } from '@/composables/useAutoScroll'
import { useChatStream } from '@/composables/useChatStream'

const chatStore = useChatStore()
const { activeConversationId } = storeToRefs(chatStore)
const { addMessage, addConversation, createConversation, getActiveConversation } = chatStore

const { streamingContent, streamingMessageId, abort, stream } = useChatStream()

const messagesContainer = ref<HTMLElement | null>(null)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)

const messages = computed(() => {
  const activeConversation = chatStore.getActiveConversation()
  if (!activeConversation) return []
  return activeConversation.messages.map((m) => {
    if (m.id === streamingMessageId.value && streamingContent.value) {
      return { ...m, content: streamingContent.value }
    }
    return m
  })
})

useAutoScroll(messages, messagesContainer)

onMounted(async () => {
  await chatStore.syncFromServer()
  // 同步后若当前对话无消息，从服务端加载
  const active = getActiveConversation()
  if (active && active.messages.length === 0) {
    const full = await chatApi.fetchConversation(active.id)
    if (full) {
      active.messages = full.messages
    }
  }
})

onUnmounted(() => {
  abort()
})

const handleSendMessage = async (content: string) => {
  let conversationId = activeConversationId.value

  if (!conversationId) {
    try {
      const newConv = await chatApi.createConversation()
      conversationId = newConv.id
      addConversation({
        id: newConv.id,
        title: newConv.title,
        messages: [],
        createdAt: newConv.createdAt,
        updatedAt: newConv.updatedAt,
        isPinned: newConv.isPinned,
      })
    } catch {
      const fallback = createConversation()
      conversationId = fallback.id
    }
  }

  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: Date.now(),
  }

  addMessage(conversationId, userMessage)

  await stream(conversationId, content, (v) => chatInputRef.value?.setLoading(v))
}

const handleRegenerate = async (messageId: string) => {
  const activeConversation = getActiveConversation()
  if (!activeConversation) return

  const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId)
  if (msgIndex < 0) return

  // 向前查找最近的一条用户消息（不依赖数组索引顺序假设）
  let userMsg: Message | undefined
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (activeConversation.messages[i]!.role === 'user') {
      userMsg = activeConversation.messages[i]
      break
    }
  }
  if (!userMsg) return

  activeConversation.messages.splice(msgIndex, 1)
  try {
    await stream(activeConversation.id, userMsg.content, (v) => chatInputRef.value?.setLoading(v))
  } catch {
    chatInputRef.value?.setLoading(false)
  }
}
</script>

<template>
  <AppLayout>
    <div class="chat-view">
      <div ref="messagesContainer" class="chat-messages" role="feed" aria-label="对话消息列表">
        <div v-if="messages.length === 0" class="welcome-section">
          <div class="welcome-content">
            <el-avatar :src="nortonAvatar" :size="80" class="welcome-avatar" />
            <h2>你好！我是试金石小助手</h2>
            <p>有什么我可以帮助你的吗？</p>
          </div>
        </div>
        <ChatMessage
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :can-regenerate="
            message.role === 'assistant' &&
            !message.isStreaming &&
            message.content.length > 0 &&
            index === messages.length - 1
          "
          @regenerate="handleRegenerate(message.id)"
        />
      </div>

      <ChatInput
        ref="chatInputRef"
        @send-message="handleSendMessage"
        @stop="abort"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: var(--bg-color);
}

.welcome-section {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}

.welcome-content {
  max-width: 400px;
}

.welcome-avatar {
  margin-bottom: 20px;
}

.welcome-content h2 {
  color: var(--text-color);
  margin-bottom: 10px;
}

.welcome-content p {
  color: var(--text-muted);
}
</style>
