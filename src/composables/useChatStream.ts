/**
 * AI 流式对话逻辑
 * 封装 AbortController → SSE 迭代 → 流式内容累积 → 落库的全过程
 */
import { ref } from 'vue'
import type { Message } from '@/types'
import { useChatStore } from '@/stores/chat'
import { chatApi } from '@/api/chat'
import { logger } from '@/utils/logger'

export function useChatStream() {
  const chatStore = useChatStore()
  const { addMessage, getActiveConversation } = chatStore

  const streamingContent = ref('')
  const streamingMessageId = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  const getStreamingMessage = (messageId: string) => {
    return getActiveConversation()?.messages.find((m: Message) => m.id === messageId)
  }

  const abort = () => {
    abortController.value?.abort()
  }

  const stream = async (
    conversationId: string,
    prompt: string,
    onLoadingChange?: (v: boolean) => void,
  ) => {
    if (abortController.value) {
      abortController.value.abort()
    }

    const aiMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }

    addMessage(conversationId, aiMessage)
    streamingMessageId.value = aiMessage.id
    streamingContent.value = ''

    const controller = new AbortController()
    abortController.value = controller

    try {
      const sseStream = chatApi.sendMessageStream(
        { message: prompt, conversationId },
        controller.signal,
      )

      for await (const chunk of sseStream) {
        if (controller.signal.aborted) break

        if (chunk.type === 'chunk' && chunk.content) {
          streamingContent.value += chunk.content
        } else if (chunk.type === 'end') {
          const streamingMsg = getStreamingMessage(aiMessage.id)
          if (streamingMsg) {
            streamingMsg.content = streamingContent.value.trim()
            streamingMsg.isStreaming = false
          }
          if (chunk.conversationId && chunk.conversationId !== conversationId) {
            const conv = chatStore.conversations.find((c) => c.id === conversationId)
            if (conv) {
              conv.id = chunk.conversationId
              chatStore.activeConversationId = chunk.conversationId
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // user cancelled; partial content committed in finally
      } else {
        logger.error('Error sending message:', error)
        const streamingMsg = getStreamingMessage(aiMessage.id)
        if (streamingMsg) {
          if (streamingContent.value) {
            streamingMsg.content = streamingContent.value + '\n\n[回复中断]'
          } else {
            streamingMsg.content = '抱歉，发送消息时出现错误，请重试。'
          }
          streamingMsg.isStreaming = false
        }
      }
    } finally {
      // 提交部分内容到 store（用户停止 或 流中断）
      const streamingMsg = getStreamingMessage(aiMessage.id)
      if (streamingMsg?.isStreaming && streamingContent.value) {
        streamingMsg.content = streamingContent.value
        streamingMsg.isStreaming = false
      }

      streamingContent.value = ''
      streamingMessageId.value = null
      if (abortController.value === controller) {
        abortController.value = null
      }
      onLoadingChange?.(false)
    }
  }

  return { streamingContent, streamingMessageId, abortController, abort, stream }
}
