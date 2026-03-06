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

if (env.isDev) globalForPrisma.prisma = prisma
