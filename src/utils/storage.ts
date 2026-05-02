/**
 * 本地存储工具函数
 * 提供 localStorage 的安全封装，处理异常情况
 */
import { logger } from './logger'

/**
 * localStorage 键名常量
 * 确保项目中使用统一的存储键名，避免拼写错误
 */
export const STORAGE_KEYS = {
  theme: 'ai_chat_theme',
  chat: 'ai_chat_store',
  user: 'ai_chat_user',
} as const

/**
 * localStorage 安全包装器
 * 捕获 QuotaExceededError 等异常，避免静默失败
 * 供 pinia-plugin-persistedstate 的 `storage` 选项使用
 */
export const safeStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        logger.error('localStorage 配额已满，数据保存失败')
      } else {
        logger.error('localStorage 写入失败:', e)
      }
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
  },
}
