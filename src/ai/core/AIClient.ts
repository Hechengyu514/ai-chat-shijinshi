/**
 * AI 核心客户端
 * 封装 HTTP 请求 + SSE 流解析 + 中间件管道
 *
 * 中间件在请求生命周期的两个阶段被调用：
 *   1. 请求前（ctx.error == null && ctx.response == null）— 可修改 ctx.request
 *   2. 请求出错后（ctx.error != null）— 可设置 ctx.retry = true 触发重试
 *
 * 中间件签名：(ctx, next) => Promise<void>
 * 调用 next() 将控制权交给下一个中间件（洋葱模型）
 */
import type {
  AIClientConfig,
  Middleware,
  MiddlewareContext,
  StreamChunk,
} from './types'
import type { ChatRequest, ChatResponse } from '@/types'
import { parseSSEStream } from './StreamParser'

const MAX_RETRY_ATTEMPTS = 5

export class AIClient {
  private config: AIClientConfig
  private middlewares: Middleware[] = []

  constructor(config: AIClientConfig) {
    this.config = {
      modelParams: { temperature: 0.7, topP: 0.9, maxTokens: 2048 },
      ...config,
    }
  }

  /** 注册中间件（按注册顺序执行） */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware)
    return this
  }

  /** 流式聊天：返回 AsyncGenerator，实时 yield 每个 SSE chunk */
  async *streamChat(
    request: ChatRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const ctx: MiddlewareContext = { request, signal }

    // MAX_RETRY_ATTEMPTS 仅作为安全上限防止死循环，
    // 实际重试次数由中间件通过 ctx.retry 控制
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      await this.runPipeline(ctx)

      try {
        const response = await this.fetchSSE(ctx)

        const reader = response.body!.getReader()
        for await (const chunk of parseSSEStream<StreamChunk>(reader, signal)) {
          ctx.response = chunk
          yield chunk
        }
        return
      } catch (error) {
        ctx.error = error as Error
        ctx.retry = false

        await this.runPipeline(ctx)

        if (!ctx.retry) throw ctx.error
      }
    }

    throw ctx.error ?? new Error('已达到最大重试次数')
  }

  /** 非流式聊天：收集所有 chunk 后返回完整结果 */
  async chat(
    request: ChatRequest,
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
    let content = ''
    let conversationId: string | undefined

    for await (const chunk of this.streamChat(request, signal)) {
      if (chunk.type === 'chunk' && chunk.content) {
        content += chunk.content
      } else if (chunk.type === 'end') {
        conversationId = chunk.conversationId
      }
    }

    return { type: 'end', content: content || undefined, conversationId }
  }

  // ========== 私有方法 ==========

  private async fetchSSE(ctx: MiddlewareContext): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const dynamicHeaders = this.config.headers?.()
    if (dynamicHeaders) Object.assign(headers, dynamicHeaders)

    const response = await fetch(`${this.config.baseURL}/api/chat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversationId: ctx.request.conversationId,
        message: ctx.request.message,
        ...this.config.modelParams,
      }),
      signal: ctx.signal,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(err.error || `HTTP ${response.status}`)
    }

    if (!response.body) {
      throw new Error('浏览器不支持流式读取')
    }

    return response
  }

  /** 运行中间件洋葱管道 */
  private async runPipeline(ctx: MiddlewareContext): Promise<void> {
    if (this.middlewares.length === 0) return

    let index = 0

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index++]!
        await mw(ctx, next)
      }
    }

    await next()
  }

}
