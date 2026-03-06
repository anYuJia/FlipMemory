import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './shared/config/index.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { memoryRoutes } from './modules/memory/memory.routes.js'
import { uploadRoutes } from './modules/upload/upload.routes.js'
import { userRoutes } from './modules/user/user.routes.js'
import { registerSecurityHeaders, sanitizeBodyMiddleware } from './shared/middleware/security.js'
import { registerRateLimit } from './shared/middleware/rateLimit.js'

export async function buildApp() {
    const app = Fastify({
        logger: env.isDev
            ? {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    },
                },
            }
            : true,
    })

    // 安全头 (暂时禁用以排查 CORS 问题)
    // registerSecurityHeaders(app)

    // 请求体清理（XSS 防护）
    app.addHook('preHandler', sanitizeBodyMiddleware)

    // CORS（终极宽松模式）
    await app.register(cors, {
        origin: (origin, cb) => {
            // 直接允许所有 origin，并在响应中反射请求的 origin
            cb(null, true)
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204
    })

    // API 速率限制
    await registerRateLimit(app)

    // JWT
    await app.register(jwt, {
        secret: env.jwt.secret,
        sign: {
            expiresIn: env.jwt.expiresIn,
        },
    })

    // Health check
    app.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // API 路由
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.register(userRoutes, { prefix: '/api/user' })
    await app.register(memoryRoutes, { prefix: '/api/memories' })
    await app.register(uploadRoutes, { prefix: '/api/upload' })

    // 全局错误处理
    app.setErrorHandler((error: unknown, request, reply) => {
        app.log.error(error)

        const err = error as { statusCode?: number; message?: string }
        const statusCode = err.statusCode || 500
        const message = err.message || 'Internal server error'

        reply.status(statusCode).send({
            code: statusCode,
            message,
        })
    })

    return app
}
