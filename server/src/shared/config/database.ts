import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: env.isDev ? ['query', 'error', 'warn'] : ['error'],
    })

if (env.isDev) globalForPrisma.prisma = prisma
