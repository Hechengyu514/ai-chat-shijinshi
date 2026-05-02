/**
 * 聊天 API 模块
 * 所有对话相关请求，对接后端 Express 服务
 * SSE 流式请求使用原生 fetch（ReadableStream 支持最稳定）
 */
import type { Message, ChatRequest, ChatResponse } from '@/types'
import { apiGet, apiPost, apiPut, apiDelete, BASE_URL, getToken } from './client'
import { logger } from '@/utils/logger'
import { parseSSEStream } from '@/ai/core/StreamParser'

// 后端返回的对话摘要（不含消息内容）
interface ConversationSummary {
  id: string
  title: string
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

// 后端返回的完整对话（含消息列表）
interface ConversationFull extends ConversationSummary {
  messages: Message[]
}

export const chatApi = {
  // ========== SSE 流式消息（核心） ==========
  /**
   * 发送消息并获取 AI 流式回复
   * 返回 AsyncGenerator，用法和之前 mock 版完全一致
   */
  async *sendMessageStream(
    request: ChatRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatResponse> {
    const token = getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversationId: request.conversationId,
        message: request.message,
      }),
      signal,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(err.error || '请求失败')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('浏览器不支持流式读取')

    yield* parseSSEStream<ChatResponse>(reader, signal)
  },

  // ========== 对话 CRUD ==========

  /** 获取对话列表 */
  async fetchConversations(): Promise<ConversationSummary[]> {
    try {
      return await apiGet<ConversationSummary[]>('/api/conversations')
    } catch {
      return []
    }
  },

  /** 获取单个对话（含消息） */
  async fetchConversation(id: string): Promise<ConversationFull | null> {
    try {
      return await apiGet<ConversationFull>(`/api/conversations/${id}`)
    } catch (error) {
      logger.error('Error fetching conversation:', error)
      return null
    }
  },

  /** 创建新对话 */
  async createConversation(): Promise<ConversationFull> {
    return apiPost<ConversationFull>('/api/conversations')
  },

  /** 更新对话（重命名/置顶） */
  async updateConversation(
    id: string,
    params: { title?: string; isPinned?: boolean },
  ): Promise<boolean> {
    try {
      await apiPut(`/api/conversations/${id}`, params)
      return true
    } catch {
      return false
    }
  },

  /** 删除对话 */
  async deleteConversation(id: string): Promise<boolean> {
    try {
      await apiDelete(`/api/conversations/${id}`)
      return true
    } catch {
      return false
    }
  },
}
