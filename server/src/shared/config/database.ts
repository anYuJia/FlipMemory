import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: env.isDev ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: env.databaseUrl + (env.databaseUrl.includes('?') ? '&' : '?') + 'connection_limit=20&pool_timeout=10',
            },
        },
    })

// 全局缓存 PrismaClient（生产环境也缓存，防止 hot-reload 或 worker 创建多实例耗尽连接池）
globalForPrisma.prisma = prisma
