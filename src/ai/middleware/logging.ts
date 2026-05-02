/**
 * 请求日志中间件
 *
 * 在请求前记录发送内容摘要，在出错时记录错误信息
 * 生产环境仅输出 error 级别日志
 */
import type { Middleware } from '../core/types'
import { logger } from '@/utils/logger'

export interface LoggingOptions {
  /** 日志级别，默认 'info' */
  level?: 'debug' | 'info' | 'warn' | 'error'
  /** 日志前缀，默认 '[AI SDK]' */
  prefix?: string
}

export function createLoggingMiddleware(options: LoggingOptions = {}): Middleware {
  const { level = 'info', prefix = '[AI SDK]' } = options

  return async (ctx, next) => {
    // 错误阶段
    if (ctx.error) {
      const logFn = logger.error
      logFn(`${prefix} 请求失败:`, ctx.error.message)
      return
    }

    // 请求前阶段
    const preview =
      ctx.request.message.length > 80
        ? ctx.request.message.slice(0, 80) + '...'
        : ctx.request.message

    if (level === 'debug') {
      logger.log(`${prefix} 发送请求:`, {
        conversationId: ctx.request.conversationId,
        message: preview,
      })
    } else if (level === 'info') {
      logger.log(`${prefix} 发送请求: "${preview}"`)
    }

    await next()
  }
}
