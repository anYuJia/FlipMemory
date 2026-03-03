/**
 * API 速率限制中间件
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getRedis } from '../config/redis.js'

interface RateLimitOptions {
    max: number           // 最大请求数
    timeWindow: number    // 时间窗口（毫秒）
    keyGenerator?: (req: FastifyRequest) => string
    errorMessage?: string
}

const defaultOptions: RateLimitOptions = {
    max: 100,
    timeWindow: 60 * 1000, // 1 分钟
    errorMessage: '请求过于频繁，请稍后再试',
}

/**
 * 生成速率限制键
 */
function defaultKeyGenerator(req: FastifyRequest): string {
    // 优先使用用户 ID，否则使用 IP
    const userId = (req as any).user?.id
    if (userId) {
        return `ratelimit:user:${userId}`
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    return `ratelimit:ip:${ip}`
}

/**
 * 内存存储（当 Redis 不可用时）
 */
const memoryStore = new Map<string, { count: number; resetTime: number }>()

/**
 * 清理过期的内存存储
 */
function cleanupMemoryStore() {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
        if (value.resetTime < now) {
            memoryStore.delete(key)
        }
    }
}

// 每分钟清理一次
setInterval(cleanupMemoryStore, 60 * 1000)

/**
 * 速率限制中间件
 */
export async function rateLimitMiddleware(
    req: FastifyRequest,
    reply: FastifyReply,
    options: Partial<RateLimitOptions> = {}
): Promise<void> {
    const opts = { ...defaultOptions, ...options }
    const keyGenerator = opts.keyGenerator || defaultKeyGenerator
    const key = keyGenerator(req)
    const redis = getRedis()

    let current: number
    let resetTime: number

    if (redis) {
        // 使用 Redis
        try {
            const now = Date.now()
            const windowStart = now - opts.timeWindow

            // 使用 Redis 的滑动窗口算法
            const multi = redis.multi()
            multi.zremrangebyscore(key, 0, windowStart)
            multi.zadd(key, now, `${now}`)
            multi.zcard(key)
            multi.expire(key, Math.ceil(opts.timeWindow / 1000))

            const results = await multi.exec()
            current = results?.[2]?.[1] as number || 0
            resetTime = now + opts.timeWindow
        } catch (error) {
            console.error('Rate limit Redis error:', error)
            // Redis 错误时放行
            return
        }
    } else {
        // 使用内存存储
        const now = Date.now()
        const stored = memoryStore.get(key)

        if (stored && stored.resetTime > now) {
            current = stored.count + 1
            stored.count = current
            resetTime = stored.resetTime
        } else {
            current = 1
            resetTime = now + opts.timeWindow
            memoryStore.set(key, { count: current, resetTime })
        }
    }

    // 设置响应头
    reply.header('X-RateLimit-Limit', opts.max)
    reply.header('X-RateLimit-Remaining', Math.max(0, opts.max - current))
    reply.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000))

    // 检查是否超过限制
    if (current > opts.max) {
        reply.header('Retry-After', Math.ceil((resetTime - Date.now()) / 1000))
        reply.status(429).send({
            code: 429,
            message: opts.errorMessage,
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        })
        return
    }
}

/**
 * 注册速率限制插件
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
    // 全局速率限制
    app.addHook('preHandler', async (req, reply) => {
        await rateLimitMiddleware(req, reply, {
            max: 100,
            timeWindow: 60 * 1000,
        })
    })
}

/**
 * 端点级速率限制配置
 */
export const endpointRateLimits = {
    // 登录：5 次/分钟
    login: {
        max: 5,
        timeWindow: 60 * 1000,
        errorMessage: '登录尝试过于频繁，请稍后再试',
    },
    // 注册：3 次/分钟
    register: {
        max: 3,
        timeWindow: 60 * 1000,
        errorMessage: '注册请求过于频繁，请稍后再试',
    },
    // 上传：10 次/分钟
    upload: {
        max: 10,
        timeWindow: 60 * 1000,
        errorMessage: '上传请求过于频繁，请稍后再试',
    },
    // 搜索：30 次/分钟
    search: {
        max: 30,
        timeWindow: 60 * 1000,
        errorMessage: '搜索请求过于频繁，请稍后再试',
    },
    // 创建记忆：20 次/分钟
    createMemory: {
        max: 20,
        timeWindow: 60 * 1000,
        errorMessage: '创建记忆请求过于频繁，请稍后再试',
    },
}

/**
 * 创建端点级速率限制中间件
 */
export function createEndpointRateLimit(endpoint: keyof typeof endpointRateLimits) {
    const config = endpointRateLimits[endpoint]
    return async (req: FastifyRequest, reply: FastifyReply) => {
        await rateLimitMiddleware(req, reply, {
            ...config,
            keyGenerator: (r) => `ratelimit:${endpoint}:${defaultKeyGenerator(r)}`,
        })
    }
}
