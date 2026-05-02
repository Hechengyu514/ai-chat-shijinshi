// 消息接口
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  timestamp: number
}

// 对话接口
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  isPinned?: boolean
}

// 聊天请求接口
export interface ChatRequest {
  message: string
  conversationId?: string
}

// 聊天响应接口
export interface ChatResponse {
  type: 'chunk' | 'end' | 'error'
  content?: string
  error?: string
  conversationId?: string
}
