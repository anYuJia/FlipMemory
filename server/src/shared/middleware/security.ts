/**
 * 安全头中间件
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/**
 * 安全头配置
 */
export const securityHeaders = {
    // 防止 MIME 类型嗅探
    'X-Content-Type-Options': 'nosniff',

    // 防止点击劫持
    'X-Frame-Options': 'DENY',

    // XSS 防护
    'X-XSS-Protection': '0',

    // 引用策略
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // 权限策略
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
}

/**
 * 安全头中间件
 */
export async function securityHeadersMiddleware(
    _req: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    for (const [header, value] of Object.entries(securityHeaders)) {
        reply.header(header, value)
    }
}

/**
 * 注册安全头插件
 */
export async function registerSecurityHeaders(app: FastifyInstance): Promise<void> {
    app.addHook('onSend', async (_req, reply) => {
        for (const [header, value] of Object.entries(securityHeaders)) {
            reply.header(header, value)
        }
    })
}

/**
 * CORS 配置
 */
export function getCorsConfig(frontendUrls: string | string[]) {
    const origins = Array.isArray(frontendUrls) ? frontendUrls : [frontendUrls]

    return {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // 允许没有 origin 的请求（如移动端应用）
            if (!origin) {
                callback(null, true)
                return
            }

            // 检查是否在允许列表中
            if (origins.includes(origin) || origins.includes('*')) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'), false)
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 86400, // 24 小时
    }
}

/**
 * 输入清理函数
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input

    return input
        // 移除 HTML 标签
        .replace(/<[^>]*>/g, '')
        // 转义特殊字符
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        // 移除潜在的脚本注入
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
}

/**
 * 深度清理对象
 */
export function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeInput(obj)
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
    }

    if (obj && typeof obj === 'object') {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value)
        }
        return sanitized
    }

    return obj
}

/**
 * 请求体清理中间件
 */
export async function sanitizeBodyMiddleware(
    req: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body)
    }
}
