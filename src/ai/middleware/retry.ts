/**
 * 指数退避重试中间件
 *
 * 在请求出错阶段检查错误类型，对可重试错误（网络异常、5xx）设置 ctx.retry
 * AIClient 检测到 ctx.retry 后会自动以指数退避策略重新发起请求
 */
import type { Middleware } from '../core/types'
import { logger } from '@/utils/logger'

export interface RetryOptions {
  /** 最大重试次数，默认 2 */
  maxRetries?: number
  /** 基础延迟（毫秒），默认 1000 */
  baseDelayMs?: number
  /** 退避倍率，默认 2 */
  backoffMultiplier?: number
  /** 自定义重试条件，默认网络错误 + 5xx */
  retryOn?: (error: Error) => boolean
}

const defaultRetryOn = (error: Error): boolean => {
  const msg = error.message.toLowerCase()
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    !msg.includes('abort') // 不重试用户主动取消
  )
}

export function createRetryMiddleware(options: RetryOptions = {}): Middleware {
  const { maxRetries = 2, baseDelayMs = 1000, backoffMultiplier = 2, retryOn = defaultRetryOn } = options

  let attempt = 0

  return async (ctx, next) => {
    // 请求前：重置计数器
    if (!ctx.error && !ctx.response) {
      attempt = 0
    }

    await next()

    // 错误阶段：判断是否需要重试
    if (ctx.error && attempt < maxRetries && retryOn(ctx.error)) {
      attempt++
      const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1)
      logger.log(`[AI SDK] 第 ${attempt} 次重试，等待 ${delay}ms`)
      ctx.retry = true
    }
  }
}
