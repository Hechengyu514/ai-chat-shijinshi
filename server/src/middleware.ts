/**
 * JWT 鉴权中间件
 * 从请求头中提取 token 并验证，验证通过后将 userId 挂载到 req 上
 */
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error('环境变量 JWT_SECRET 未设置')

// 扩展 Express Request 类型，给 req 增加 userId 字段
export interface AuthRequest extends Request {
  userId?: string
}

/**
 * 鉴权中间件：验证请求中的 Bearer token
 * 不通过时返回 401 并阻止后续处理
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先登录' })
    return
  }

  const token = header.slice(7) // 去掉 "Bearer " 前缀

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}
