/**
 * AI SDK 核心类型定义
 */
import type { Message, ChatRequest, ChatResponse } from '@/types'

export type { Message, ChatRequest, ChatResponse }

/** 模型参数配置 */
export interface ModelParams {
  temperature?: number
  topP?: number
  maxTokens?: number
  model?: string
}

/** AI 客户端配置 */
export interface AIClientConfig {
  baseURL: string
  modelParams?: ModelParams
  headers?: () => Record<string, string>
}

/** SSE 流块（与 ChatResponse 对齐，语义更明确） */
export interface StreamChunk {
  type: 'chunk' | 'end' | 'error'
  content?: string
  error?: string
  conversationId?: string
}

/** 中间件上下文 */
export interface MiddlewareContext {
  request: ChatRequest
  response?: StreamChunk
  error?: Error | null
  signal?: AbortSignal
  /** 中间件可设置此标记要求重试 */
  retry?: boolean
}

/** 中间件函数（洋葱模型） */
export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<void>,
) => Promise<void>

/** 对话存储适配器接口 */
export interface ChatAdapter {
  getMessages(conversationId: string): Message[]
  addMessage(conversationId: string, message: Message): void
  updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>,
  ): void
  removeMessage(conversationId: string, messageId: string): void
}
