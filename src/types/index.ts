/**
 * 类型导出入口
 * 统一导出项目中所有类型定义
 */
export type { Message, Conversation, ChatRequest, ChatResponse } from './chat'
export type { UserInfo } from './user'
export type { Theme } from './theme'

export interface AppError {
  id: string
  message: string
  timestamp: number
}
