import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import compress from '@fastify/compress'
import { env } from './shared/config/index.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { memoryRoutes } from './modules/memory/memory.routes.js'
import { uploadRoutes } from './modules/upload/upload.routes.js'
import { userRoutes } from './modules/user/user.routes.js'
import { registerSecurityHeaders, sanitizeBodyMiddleware } from './shared/middleware/security.js'
import { registerRateLimit } from './shared/middleware/rateLimit.js'
import { prisma } from './shared/config/index.js'
import { getRedis } from './shared/config/redis.js'

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

    // 安全头
    registerSecurityHeaders(app)

    // CORS — 安卓 App (Capacitor) origin 不可预测，需放行所有来源
    await app.register(cors, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        maxAge: 86400,
    })

    // 响应压缩（brotli 优先，gzip 兜底，阈值 1KB）
    await app.register(compress, { threshold: 1024 })

    // API 速率限制（先于请求体清理，尽早拒绝超限请求）
    await registerRateLimit(app)

    // 请求体清理（XSS 防护）
    app.addHook('preHandler', sanitizeBodyMiddleware)

    // JWT
    await app.register(jwt, {
        secret: env.jwt.secret,
        sign: {
            expiresIn: env.jwt.expiresIn,
        },
    })

    // Health check（验证核心依赖）
    app.get('/health', async () => {
        const checks: Record<string, string> = {}

        // 检查数据库
        try {
            await prisma.$queryRaw`SELECT 1`
            checks.database = 'ok'
        } catch (err) {
            app.log.error(err, 'Health check: database error')
            checks.database = 'error'
        }

        // 检查 Redis
        const redis = getRedis()
        if (redis) {
            try {
                await redis.ping()
                checks.redis = 'ok'
            } catch (err) {
                app.log.error(err, 'Health check: redis error')
                checks.redis = 'error'
            }
        } else {
            checks.redis = 'not_configured'
        }

        const allOk = Object.values(checks).every(v => v === 'ok' || v === 'not_configured')
        return {
            status: allOk ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            checks,
        }
    })

    // API 路由
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.register(userRoutes, { prefix: '/api/user' })
    await app.register(memoryRoutes, { prefix: '/api/memories' })
    await app.register(uploadRoutes, { prefix: '/api/upload' })

    // 全局错误处理
    app.setErrorHandler((error: unknown, request, reply) => {
        app.log.error(error)

        const err = error as { statusCode?: number; message?: string; validation?: unknown }
        const statusCode = err.statusCode || 500

        // 客户端错误 (4xx) 且非验证错误：返回原始消息
        // 服务端错误 (5xx)：使用通用消息，避免泄露内部实现细节
        let message: string
        if (statusCode >= 500) {
            message = 'Internal server error'
        } else if (err.validation) {
            message = 'Validation error'
        } else {
            message = err.message || 'Request failed'
        }

        reply.status(statusCode).send({
            code: statusCode,
            message,
        })
    })

    return app
}
