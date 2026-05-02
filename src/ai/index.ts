/**
 * AI SDK 统一导出
 */
export { AIClient } from './core/AIClient'
export { parseSSEStream } from './core/StreamParser'
export { useChat } from './composables/useChat'
export { createPiniaChatAdapter, createMemoryChatAdapter } from './composables/useChatAdapter'
export { createRetryMiddleware } from './middleware/retry'
export { createLoggingMiddleware } from './middleware/logging'
export type {
  AIClientConfig,
  ModelParams,
  StreamChunk,
  MiddlewareContext,
  Middleware,
  ChatAdapter,
} from './core/types'
export type { UseChatOptions, UseChatReturn } from './composables/useChat'
export type { RetryOptions } from './middleware/retry'
export type { LoggingOptions } from './middleware/logging'
