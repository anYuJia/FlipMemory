/**
 * 验证码服务
 * 使用 Redis 存储验证码，支持防刷、过期、错误次数限制
 */

import { randomInt, timingSafeEqual } from 'crypto'
import { getRedis } from '../config/redis.js'
import { sendVerificationEmail } from './email.service.js'

const CODE_PREFIX = 'flipmemory:vcode:'
const DAILY_PREFIX = 'flipmemory:vcode_daily:'
const CODE_TTL = 300          // 验证码有效期 5 分钟
const SEND_INTERVAL = 60      // 同一邮箱 60 秒内不能重发
const MAX_VERIFY_ATTEMPTS = 5 // 最多验证 5 次
const MAX_DAILY_SENDS = 10    // 同一邮箱每天最多发送 10 次

type CodePurpose = 'register' | 'reset_password' | 'change_email'

interface StoredCode {
    code: string
    sentAt: number
    attempts: number
    expiresAt: number   // 绝对过期时间戳（秒）
}

/**
 * 使用加密安全随机数生成 6 位验证码
 */
function generateCode(): string {
    return String(randomInt(100000, 999999))
}

function redisKey(purpose: CodePurpose, email: string): string {
    return `${CODE_PREFIX}${purpose}:${email.toLowerCase()}`
}

function dailyKey(email: string): string {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `${DAILY_PREFIX}${email.toLowerCase()}:${today}`
}

/**
 * 时序安全的字符串比较
 */
function safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * 发送验证码
 */
export async function sendCode(email: string, purpose: CodePurpose): Promise<{ success: boolean; message: string }> {
    const redis = getRedis()
    if (!redis) {
        return { success: false, message: '服务暂不可用' }
    }

    const key = redisKey(purpose, email)

    // 检查每日发送上限
    const dKey = dailyKey(email)
    const dailyCount = await redis.get(dKey)
    if (dailyCount && parseInt(dailyCount, 10) >= MAX_DAILY_SENDS) {
        return { success: false, message: '今日发送次数已达上限，请明天再试' }
    }

    // 检查是否在冷却期内
    const existing = await redis.get(key)
    if (existing) {
        const stored: StoredCode = JSON.parse(existing)
        const elapsed = Math.floor(Date.now() / 1000) - stored.sentAt
        if (elapsed < SEND_INTERVAL) {
            const wait = SEND_INTERVAL - elapsed
            return { success: false, message: `请 ${wait} 秒后再试` }
        }
    }

    // 生成验证码
    const code = generateCode()

    // 发送邮件
    const sent = await sendVerificationEmail(email, code, purpose)
    if (!sent) {
        return { success: false, message: '邮件发送失败，请稍后重试' }
    }

    const now = Math.floor(Date.now() / 1000)

    // 存储到 Redis
    const data: StoredCode = {
        code,
        sentAt: now,
        attempts: 0,
        expiresAt: now + CODE_TTL,
    }
    await redis.setex(key, CODE_TTL, JSON.stringify(data))

    // 递增每日发送计数（当天结束过期）
    const incrResult = await redis.incr(dKey)
    if (incrResult === 1) {
        // 首次设置，到次日 0 点过期
        const now2 = new Date()
        const tomorrow = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() + 1)
        const secondsUntilMidnight = Math.ceil((tomorrow.getTime() - now2.getTime()) / 1000)
        await redis.expire(dKey, secondsUntilMidnight)
    }

    return { success: true, message: '验证码已发送' }
}

/**
 * 验证验证码
 */
export async function verifyCode(email: string, purpose: CodePurpose, inputCode: string): Promise<{ valid: boolean; message: string }> {
    const redis = getRedis()
    if (!redis) {
        return { valid: false, message: '服务暂不可用' }
    }

    const key = redisKey(purpose, email)
    const raw = await redis.get(key)

    if (!raw) {
        return { valid: false, message: '验证码已过期或未发送' }
    }

    const stored: StoredCode = JSON.parse(raw)

    // 检查绝对过期时间（防止 TTL 被重置）
    if (Math.floor(Date.now() / 1000) > stored.expiresAt) {
        await redis.del(key)
        return { valid: false, message: '验证码已过期，请重新获取' }
    }

    // 检查尝试次数
    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
        await redis.del(key)
        return { valid: false, message: '验证码已失效，请重新获取' }
    }

    // 时序安全的比较
    if (!safeCompare(stored.code, inputCode)) {
        stored.attempts++
        // 使用剩余 TTL 而非重置，防止攻击者通过错误尝试续命
        const remainingTtl = await redis.ttl(key)
        if (remainingTtl > 0) {
            await redis.setex(key, remainingTtl, JSON.stringify(stored))
        }
        const remaining = MAX_VERIFY_ATTEMPTS - stored.attempts
        return { valid: false, message: `验证码错误，还可尝试 ${remaining} 次` }
    }

    // 验证成功，删除验证码
    await redis.del(key)
    return { valid: true, message: '验证成功' }
}
