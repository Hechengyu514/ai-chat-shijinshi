/**
 * 服务端日志
 * 开发环境输出完整错误堆栈，生产环境仅输出消息避免泄露内部信息
 */
const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      console.error(message, error instanceof Error ? error.stack : error)
    } else {
      console.error(message)
    }
  },
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
}
