import { FastifyRequest, FastifyReply } from 'fastify'
import { unauthorized } from '../utils/response.js'
import { prisma } from '../config/index.js'
import { getRedis } from '../config/redis.js'

declare module 'fastify' {
    interface FastifyRequest {
        userId: string
    }
}

const USER_EXISTS_TTL = 60 // 1 分钟缓存

export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        await request.jwtVerify()
        const decoded = request.user as { id: string }
        const userId = decoded.id

        // 先查 Redis 缓存
        const redis = getRedis()
        const cacheKey = `user_exists:${userId}`

        if (redis) {
            const cached = await redis.get(cacheKey)
            if (cached === '1') {
                request.userId = userId
                return
            }
        }

        // 缓存未命中，查数据库
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }
        })

        if (!user) {
            return unauthorized(reply, 'User not found')
        }

        // 写入缓存
        if (redis) {
            await redis.setex(cacheKey, USER_EXISTS_TTL, '1').catch(() => {})
        }

        request.userId = userId
    } catch (err) {
        return unauthorized(reply, 'Invalid or expired token')
    }
}

