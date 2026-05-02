/**
 * 对话路由：对话 CRUD + 大模型流式对话（支持 OpenAI 兼容 API）
 *
 * SSE 格式（供前端消费）：
 *   data: {"type":"chunk","content":"增量文本"}
 *   data: {"type":"end"}
 */
import { Router } from 'express'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { authMiddleware, type AuthRequest } from './middleware.js'
import { prisma } from './prisma.js'
import { logger } from './logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const router = Router()

const llm = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

const LLM_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

function loadSystemPrompt(): string {
  const persona = process.env.PERSONA
  if (persona) {
    const files = persona.split(',').map((f) => f.trim())
    const parts: string[] = []
    for (const file of files) {
      const filePath = resolve(__dirname, '..', 'prompts', `${file}.md`)
      try {
        parts.push(readFileSync(filePath, 'utf-8').trim())
      } catch {
        logger.error(`人设文件未找到: ${filePath}`)
        return '你是一个有用的AI助手，请用中文回答用户的问题。回答要简洁、准确。'
      }
    }
    if (parts.length > 0) {
      return parts.join('\n\n')
    }
  }
  if (process.env.SYSTEM_PROMPT) {
    return process.env.SYSTEM_PROMPT
  }
  return '你是一个有用的AI助手，请用中文回答用户的问题。回答要简洁、准确。'
}

const SYSTEM_PROMPT = loadSystemPrompt()

// 所有对话接口都需要登录，仅对 /api/ 路径应用鉴权中间件
router.use('/api/', authMiddleware)

// ==================== 获取对话列表 ====================
router.get('/api/conversations', async (req: AuthRequest, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(conversations)
  } catch (error) {
    logger.error('获取对话列表失败:', error)
    res.status(500).json({ error: '获取对话列表失败' })
  }
})

// ==================== 获取单个对话（含消息） ====================
router.get('/api/conversations/:id', async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id as string,
        userId: req.userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      res.status(404).json({ error: '对话不存在' })
      return
    }

    // 前端 Message 类型需要的字段映射
    const messages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.createdAt).getTime(),
    }))

    res.json({
      id: conversation.id,
      title: conversation.title,
      isPinned: conversation.isPinned,
      createdAt: new Date(conversation.createdAt).getTime(),
      updatedAt: new Date(conversation.updatedAt).getTime(),
      messages,
    })
  } catch (error) {
    logger.error('获取对话详情失败:', error)
    res.status(500).json({ error: '获取对话详情失败' })
  }
})

// ==================== 创建新对话 ====================
router.post('/api/conversations', async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: '未登录，请先登录' })
      return
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId,
        title: '新对话',
      },
    })

    res.status(201).json({
      id: conversation.id,
      title: conversation.title,
      isPinned: conversation.isPinned,
      createdAt: new Date(conversation.createdAt).getTime(),
      updatedAt: new Date(conversation.updatedAt).getTime(),
      messages: [],
    })
  } catch (error) {
    logger.error('创建对话失败:', error)
    res.status(500).json({ error: '创建对话失败' })
  }
})

// ==================== 更新对话（重命名/置顶） ====================
router.put('/api/conversations/:id', async (req: AuthRequest, res) => {
  try {
    const { title, isPinned } = req.body as { title?: string; isPinned?: boolean }

    // 先确认对话属于当前用户
    const existing = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    })
    if (!existing) {
      res.status(404).json({ error: '对话不存在' })
      return
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (isPinned !== undefined) data.isPinned = isPinned

    await prisma.conversation.update({
      where: { id: req.params.id as string },
      data,
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('更新对话失败:', error)
    res.status(500).json({ error: '更新对话失败' })
  }
})

// ==================== 删除对话 ====================
router.delete('/api/conversations/:id', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    })
    if (!existing) {
      res.status(404).json({ error: '对话不存在' })
      return
    }

    await prisma.conversation.delete({ where: { id: req.params.id as string } })
    res.json({ success: true })
  } catch (error) {
    logger.error('删除对话失败:', error)
    res.status(500).json({ error: '删除对话失败' })
  }
})

// ==================== AI 对话（SSE 流式返回） ====================
router.post('/api/chat/send', async (req: AuthRequest, res) => {
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null
  const clearKeepAlive = () => {
    if (keepAliveInterval !== null) {
      clearInterval(keepAliveInterval)
      keepAliveInterval = null
    }
  }

  try {
    const { conversationId, message } = req.body as {
      conversationId?: string
      message?: string
    }

    if (!message || !message.trim()) {
      res.status(400).json({ error: '消息不能为空' })
      return
    }

    if (message.length > 8000) {
      res.status(400).json({ error: '消息长度不能超过 8000 个字符' })
      return
    }

    // 1. 找到或创建对话
    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId: req.userId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: req.userId!,
          title: message.slice(0, 30), // 用第一条消息的前30字作为标题
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    // 2. 保存用户消息到数据库
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id,
      },
    })

    // 3. 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
    })

    // 心跳保活：每隔 30 秒发送 SSE 注释行，防止 nginx / CDN / 反向代理因长空闲断开连接
    keepAliveInterval = setInterval(() => {
      res.write(': keepalive\n\n')
    }, 30000)

    // 客户端断开时清理定时器（避免内存泄漏）
    req.on('close', clearKeepAlive)

    // 4. 构建发给大模型的消息历史
    const chatMessages = [
      {
        role: 'system' as const,
        content: SYSTEM_PROMPT,
      },
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // 5. 调用大模型 API 流式生成
    const stream = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages: chatMessages,
      stream: true,
    })

    let fullContent = ''

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        if (!delta) continue

        fullContent += delta

        res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`)
      }
    } catch (err) {
      logger.error('流式响应循环出错:', err)
    }

    const cleanedContent = fullContent.trim()
    if (cleanedContent) {
      await prisma.message.create({
        data: {
          role: 'assistant',
          content: cleanedContent,
          conversationId: conversation.id,
        },
      })
    }

    // 发送结束事件，附带 conversationId 方便前端在新建对话时获取
    res.write(`data: ${JSON.stringify({ type: 'end', conversationId: conversation.id })}\n\n`)
    clearKeepAlive()
    res.end()
  } catch (error) {
    logger.error('AI 对话失败:', error)

    // 如果还没开始发送 SSE（头部未设置），返回 JSON 错误
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI 服务暂时不可用，请稍后重试' })
      return
    }

    // 已经开始流式传输，以 SSE 格式发送错误
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI 响应中断，请重试' })}\n\n`)
    clearKeepAlive()
    res.end()
  }
})

export default router
