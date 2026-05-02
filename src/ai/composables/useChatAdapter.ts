/**
 * Pinia ChatAdapter 工厂
 *
 * 将 useChatStore 包装为 ChatAdapter 接口，实现 AI SDK 与 Pinia 的解耦。
 * 必须在组件 setup 上下文中调用（内部使用 useChatStore）。
 */
import type { ChatAdapter } from '../core/types'
import type { Message } from '@/types'
import { useChatStore } from '@/stores/chat'

export function createPiniaChatAdapter(): ChatAdapter {
  const store = useChatStore()

  return {
    getMessages(conversationId: string): Message[] {
      const conv = store.conversations.find((c) => c.id === conversationId)
      return conv?.messages ?? []
    },

    addMessage(conversationId: string, message: Message): void {
      store.addMessage(conversationId, message)
    },

    updateMessage(
      conversationId: string,
      messageId: string,
      updates: Partial<Message>,
    ): void {
      const messages = this.getMessages(conversationId)
      const msg = messages.find((m) => m.id === messageId)
      if (msg) Object.assign(msg, updates)
    },

    removeMessage(conversationId: string, messageId: string): void {
      const conv = store.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const index = conv.messages.findIndex((m) => m.id === messageId)
      if (index !== -1) conv.messages.splice(index, 1)
    },
  }
}

/**
 * 创建内存 ChatAdapter（用于测试）
 * 不依赖 Pinia，数据仅存在于内存中
 */
export function createMemoryChatAdapter(): ChatAdapter {
  const storage = new Map<string, Message[]>()

  return {
    getMessages(conversationId: string): Message[] {
      return storage.get(conversationId) ?? []
    },

    addMessage(conversationId: string, message: Message): void {
      const messages = storage.get(conversationId)
      if (messages) {
        messages.push(message)
      } else {
        storage.set(conversationId, [message])
      }
    },

    updateMessage(
      conversationId: string,
      messageId: string,
      updates: Partial<Message>,
    ): void {
      const messages = storage.get(conversationId)
      const msg = messages?.find((m) => m.id === messageId)
      if (msg) Object.assign(msg, updates)
    },

    removeMessage(conversationId: string, messageId: string): void {
      const messages = storage.get(conversationId)
      if (!messages) return
      const index = messages.findIndex((m) => m.id === messageId)
      if (index !== -1) messages.splice(index, 1)
    },
  }
}
