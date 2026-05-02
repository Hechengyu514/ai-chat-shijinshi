/**
 * 日志工具函数
 * 提供开发环境和生产环境的日志输出控制
 * - `log` / `warn` 仅开发环境输出，避免生产环境泄露信息
 * - `error` 始终输出，确保线上问题可追踪
 */
const isDev = import.meta.env.DEV

export const logger = {
  log(...args: unknown[]) {
    if (isDev) console.log(...args)
  },
  warn(...args: unknown[]) {
    if (isDev) console.warn(...args)
  },
  error(...args: unknown[]) {
    console.error(...args)
  },
}
