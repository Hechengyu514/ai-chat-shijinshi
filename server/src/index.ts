/**
 * 服务入口
 * 启动 Express 服务器，挂载中间件和路由
 */
import 'dotenv/config' // 加载 .env 文件中的环境变量（必须在最前面）
import express from 'express'
import cors from 'cors'
import authRoutes from './auth.js'
import chatRoutes from './chat.js'
import { logger } from './logger.js'

const app = express()
const PORT = process.env.PORT || 3000

// ---- CORS 配置 ----
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173']

// ---- 中间件 ----
app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json({ limit: '5mb' })) // 解析 JSON 请求体（支持头像 Base64）

// ---- 根路径友好提示 ----
app.get('/', (_req, res) => {
  res.json({ message: 'AI Chat API 服务运行中', frontend: 'http://localhost:5173', docs: '/api/health' })
})

// ---- 健康检查（必须放在鉴权路由之前） ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// ---- 路由 ----
app.use(authRoutes) // 注册 + 登录（无需鉴权）
app.use(chatRoutes) // 对话接口（需要 JWT 鉴权）

// ---- 启动 ----
app.listen(PORT, () => {
  logger.info(`后端服务已启动: http://localhost:${PORT}`)
})
