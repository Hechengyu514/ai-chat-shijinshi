/**
 * useChat — AI 对话主 composable
 *
 * 替代 useChatStream，通过 ChatAdapter 解耦 Pinia，通过 AIClient 管理请求。
 *
 * 用法：
 * ```ts
 * const adapter = createPiniaChatAdapter()
 * const { send, abort, isLoading, streamingContent } = useChat({ adapter })
 * ```
 */
import { ref, type Ref } from 'vue'
import type { ChatAdapter } from '../core/types'
import type { Message } from '@/types'
import { AIClient } from '../core/AIClient'
import { generateId } from '@/utils/id'
import { getToken } from '@/api/client'
import { BASE_URL } from '@/api/client'
import { createLoggingMiddleware } from '../middleware/logging'
import { createRetryMiddleware } from '../middleware/retry'

export interface UseChatOptions {
  /** 消息存储适配器（必填） */
  adapter: ChatAdapter
  /** AI 客户端（可选，默认创建内置实例） */
  client?: AIClient
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseChatReturn {
  isLoading: Ref<boolean>
  streamingContent: Ref<string>
  streamingMessageId: Ref<string | null>
  error: Ref<Error | null>
  send: (conversationId: string, prompt: string) => Promise<void>
  abort: () => void
  regenerate: (conversationId: string, messageId: string) => Promise<void>
}

/** 创建默认 AIClient 实例（内置日志 + 重试中间件） */
let defaultClient: AIClient | null = null

function getDefaultClient(): AIClient {
  if (!defaultClient) {
    defaultClient = new AIClient({
      baseURL: BASE_URL,
      headers: (): Record<string, string> => {
        const token = getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    })
    defaultClient.use(createLoggingMiddleware({ level: 'info' }))
    defaultClient.use(createRetryMiddleware({ maxRetries: 2 }))
  }
  return defaultClient
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { adapter, client = getDefaultClient(), onError } = options

  const isLoading = ref(false)
  const streamingContent = ref('')
  const streamingMessageId = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const abortController = ref<AbortController | null>(null)

  const abort = () => {
    abortController.value?.abort()
  }

  const send = async (conversationId: string, prompt: string) => {
    // 并发控制：取消上一个未完成的请求
    if (abortController.value) {
      abortController.value.abort()
    }

    const aiMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }

    adapter.addMessage(conversationId, aiMessage)
    streamingMessageId.value = aiMessage.id
    streamingContent.value = ''
    error.value = null
    isLoading.value = true

    const controller = new AbortController()
    abortController.value = controller

    try {
      const stream = client.streamChat(
        { message: prompt, conversationId },
        controller.signal,
      )

      for await (const chunk of stream) {
        if (controller.signal.aborted) break

        if (chunk.type === 'chunk' && chunk.content) {
          streamingContent.value += chunk.content
        } else if (chunk.type === 'end') {
          adapter.updateMessage(conversationId, aiMessage.id, {
            content: streamingContent.value.trim(),
            isStreaming: false,
          })
        }
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))

      if (e instanceof DOMException && e.name === 'AbortError') {
        // 用户主动取消，保存部分内容
        if (streamingContent.value) {
          adapter.updateMessage(conversationId, aiMessage.id, {
            content: streamingContent.value,
            isStreaming: false,
          })
        }
      } else {
        error.value = e
        onError?.(e)

        const content = streamingContent.value
          ? streamingContent.value + '\n\n[回复中断]'
          : '抱歉，发送消息时出现错误，请重试。'

        adapter.updateMessage(conversationId, aiMessage.id, {
          content,
          isStreaming: false,
        })
      }
    } finally {
      // 确保流意外中断时提交部分内容并结束流式状态
      const messages = adapter.getMessages(conversationId)
      const msg = messages.find((m) => m.id === aiMessage.id)
      if (msg?.isStreaming) {
        adapter.updateMessage(conversationId, aiMessage.id, {
          content: streamingContent.value || msg.content,
          isStreaming: false,
        })
      }

      streamingContent.value = ''
      streamingMessageId.value = null
      if (abortController.value === controller) {
        abortController.value = null
      }
      isLoading.value = false
    }
  }

  const regenerate = async (conversationId: string, messageId: string) => {
    const messages = adapter.getMessages(conversationId)
    const msgIndex = messages.findIndex((m) => m.id === messageId)
    if (msgIndex < 0) return

    // 向前查找最近的一条用户消息
    let userMsg: Message | undefined
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i]!.role === 'user') {
        userMsg = messages[i]
        break
      }
    }
    if (!userMsg) return

    // 移除旧的 AI 回复
    adapter.removeMessage(conversationId, messageId)

    await send(conversationId, userMsg.content)
  }

  return {
    isLoading,
    streamingContent,
    streamingMessageId,
    error,
    send,
    abort,
    regenerate,
  }
}
