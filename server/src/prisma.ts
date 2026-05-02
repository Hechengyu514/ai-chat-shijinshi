/**
 * Prisma 统一初始化
 * 单例模式避免热重载创建多个实例；根据 NODE_ENV 控制日志级别
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
  })

// 非生产环境将实例挂到 globalThis，确保热重载时复用
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
