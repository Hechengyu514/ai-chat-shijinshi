/**
 * 服务入口
 * 启动 Express 服务器，挂载中间件和路由
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import authRoutes from './auth.js'
import chatRoutes from './chat.js'
import { logger } from './logger.js'

const app = express()
const PORT = process.env.PORT || 3000
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---- CORS 配置 ----
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : []

// ---- 中间件 ----
// 生产环境下前后端同域名，不需要 CORS；ALLOWED_ORIGINS 未配置时自动关闭
if (ALLOWED_ORIGINS.length > 0) {
  app.use(cors({ origin: ALLOWED_ORIGINS }))
}
app.use(express.json({ limit: '5mb' }))

// ---- 静态文件（前端构建产物） ----
const staticDir = path.resolve(__dirname, '../../dist')
app.use(express.static(staticDir))

// ---- API 路由 ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})
app.use(authRoutes)
app.use(chatRoutes)

// ---- SPA fallback：所有非 API 请求返回 index.html ----
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'))
})

// ---- 启动 ----
app.listen(PORT, () => {
  logger.info(`服务已启动: http://localhost:${PORT}`)
})
