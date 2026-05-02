/**
 * 认证路由：注册 + 登录
 * POST /api/auth/register  — 注册新用户
 * POST /api/auth/login     — 登录
 * PUT  /api/auth/profile   — 更新个人资料
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authMiddleware, type AuthRequest } from './middleware.js'
import { prisma } from './prisma.js'
import { logger } from './logger.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error('环境变量 JWT_SECRET 未设置')

const TOKEN_EXPIRES_IN = '7d'

// 手机号正则（中国大陆手机号）
const PHONE_REGEX = /^1[3-9]\d{9}$/
// 用户名规则：2-30 位中文/字母/数字/下划线
const USERNAME_REGEX = /^[\w一-鿿]{2,30}$/
// 密码最小/最大长度
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 16
// 密码须包含至少一个字母和一个数字
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)/

// 简易内存限流：同一 IP 每分钟最多 10 次认证请求
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 分钟
const RATE_LIMIT_MAX = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// 每分钟清理过期条目
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 60_000).unref()

/**
 * 生成 JWT token
 */
function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN })
}

/**
 * 校验并净化用户名
 */
function sanitizeUsername(name: string): string {
  return name.replace(/<[^>]*>/g, '').slice(0, 30)
}

// ==================== 注册 ====================
router.post('/api/auth/register', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    return
  }

  try {
    const { phone, password } = req.body as { phone?: string; password?: string }

    // 参数校验
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      res.status(400).json({ error: '请输入正确的手机号' })
      return
    }
    if (
      !password ||
      typeof password !== 'string' ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      res.status(400).json({ error: `密码长度需在 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 位之间` })
      return
    }
    if (!PASSWORD_REGEX.test(password)) {
      res.status(400).json({ error: '密码须包含至少一个字母和一个数字' })
      return
    }

    // 检查手机号是否已注册
    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      res.status(409).json({ error: '该手机号已注册' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        username: `用户${phone.slice(-4)}`,
      },
    })

    const token = signToken(user.id)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    logger.error('注册失败:', error)
    res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
})

// ==================== 登录 ====================
router.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: '请求过于频繁，请稍后再试' })
    return
  }

  try {
    const { phone, password } = req.body as { phone?: string; password?: string }

    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      res.status(400).json({ error: '请输入正确的手机号' })
      return
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: '请输入密码' })
      return
    }

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      res.status(401).json({ error: '手机号码输入错误' })
      return
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      res.status(401).json({ error: '密码错误' })
      return
    }

    const token = signToken(user.id)

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    logger.error('登录失败:', error)
    res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
})

// ==================== 更新个人资料 ====================
router.put('/api/auth/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, avatar, phone } = req.body as {
      username?: string
      avatar?: string
      phone?: string
    }

    const data: Record<string, string> = {}

    if (username !== undefined) {
      if (typeof username !== 'string' || username.length === 0) {
        res.status(400).json({ error: '用户名不能为空' })
        return
      }
      if (!USERNAME_REGEX.test(username)) {
        res.status(400).json({ error: '用户名仅支持 2-30 位中英文、数字及下划线' })
        return
      }
      data.username = sanitizeUsername(username)
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        res.status(400).json({ error: '头像格式错误' })
        return
      }
      // 头像必须是合法的 data:image URL 或空字符串（清除头像）
      if (avatar !== '' && !avatar.startsWith('data:image/')) {
        res.status(400).json({ error: '头像仅支持 Base64 图片格式' })
        return
      }
      if (avatar.length > 1_000_000) {
        res.status(400).json({ error: '头像图片过大' })
        return
      }
      data.avatar = avatar
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
        res.status(400).json({ error: '手机号格式错误' })
        return
      }
      // 检查手机号未被其他用户占用
      const existing = await prisma.user.findFirst({
        where: { phone, id: { not: req.userId } },
      })
      if (existing) {
        res.status(409).json({ error: '该手机号已被其他账号使用' })
        return
      }
      data.phone = phone
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: '没有要更新的字段' })
      return
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
    })

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    logger.error('更新个人资料失败:', error)
    res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
})

export default router
