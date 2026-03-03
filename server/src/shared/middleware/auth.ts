import { FastifyRequest, FastifyReply } from 'fastify'
import { unauthorized } from '../utils/response.js'
import { prisma } from '../config/index.js'

declare module 'fastify' {
    interface FastifyRequest {
        userId: string
    }
}

export async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        await request.jwtVerify()
        const decoded = request.user as { id: string }

        // 验证用户是否仍然存在
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true }
        })

        if (!user) {
            return unauthorized(reply, 'User not found')
        }

        request.userId = decoded.id
    } catch (err) {
        return unauthorized(reply, 'Invalid or expired token')
    }
}

