/**
 * 重试中间件单元测试
 */
import { describe, it, expect, vi } from 'vitest'
import { createRetryMiddleware } from '../retry'
import type { MiddlewareContext } from '../../core/types'

function makeCtx(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  return {
    request: { message: 'test', conversationId: 'c1' },
    ...overrides,
  }
}

describe('createRetryMiddleware', () => {
  it('请求前阶段：不设置 retry', async () => {
    const mw = createRetryMiddleware()
    const ctx = makeCtx()
    const next = vi.fn()

    await mw(ctx, next)
    expect(next).toHaveBeenCalledOnce()
    expect(ctx.retry).toBeFalsy()
  })

  it('网络错误时设置 ctx.retry = true', async () => {
    const mw = createRetryMiddleware()
    const ctx = makeCtx({ error: new Error('fetch failed') })
    const next = vi.fn()

    await mw(ctx, next)
    expect(ctx.retry).toBe(true)
  })

  it('用户取消 (AbortError) 不触发重试', async () => {
    const mw = createRetryMiddleware()
    const ctx = makeCtx({ error: new DOMException('aborted', 'AbortError') })
    const next = vi.fn()

    await mw(ctx, next)
    expect(ctx.retry).toBeFalsy()
  })

  it('达到最大重试次数后不再重试', async () => {
    const mw = createRetryMiddleware({ maxRetries: 0 })
    const ctx = makeCtx({ error: new Error('network error') })
    const next = vi.fn()

    await mw(ctx, next)
    expect(ctx.retry).toBeFalsy()
  })

  it('每次错误递增重试计数器', async () => {
    const mw = createRetryMiddleware({ maxRetries: 3 })
    const next = vi.fn()

    // 第一次错误
    const ctx1 = makeCtx({ error: new Error('fetch failed') })
    await mw(ctx1, next)
    expect(ctx1.retry).toBe(true)

    // 模拟重置（请求前阶段）
    const ctxReset = makeCtx()
    await mw(ctxReset, vi.fn())
    expect(ctxReset.retry).toBeFalsy()

    // 第二次错误
    const ctx2 = makeCtx({ error: new Error('fetch failed again') })
    await mw(ctx2, next)
    expect(ctx2.retry).toBe(true)
  })

  it('自定义 retryOn 条件', async () => {
    const mw = createRetryMiddleware({
      retryOn: (e) => e.message.includes('custom'),
    })
    const ctx1 = makeCtx({ error: new Error('custom error') })
    await mw(ctx1, vi.fn())
    expect(ctx1.retry).toBe(true)

    const ctx2 = makeCtx({ error: new Error('other error') })
    await mw(ctx2, vi.fn())
    expect(ctx2.retry).toBeFalsy()
  })
})
