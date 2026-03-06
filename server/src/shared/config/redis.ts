/**
 * Redis 缓存服务
 */

import Redis from 'ioredis'
import { env } from './index.js'

// Redis 客户端
let redisClient: Redis | null = null

/**
 * 初始化 Redis 连接
 */
export function initRedis(): Redis {
    if (redisClient) {
        return redisClient
    }

    redisClient = new Redis({
        host: env.redis?.host || 'localhost',
        port: env.redis?.port || 6379,
        password: env.redis?.password,
        db: env.redis?.db || 0,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000)
            return delay
        },
        maxRetriesPerRequest: 3,
    })

    redisClient.on('connect', () => {
        console.log('Redis connected')
    })

    redisClient.on('error', (err) => {
        console.error('Redis error:', err)
    })

    return redisClient
}

/**
 * 获取 Redis 客户端
 */
export function getRedis(): Redis | null {
    return redisClient
}

/**
 * 缓存键前缀
 */
const KEY_PREFIX = 'flipmemory:'

/**
 * 缓存 TTL（秒）
 */
export const CacheTTL = {
    CALENDAR: 3600,        // 1 小时
    MEMORY: 1800,          // 30 分钟
    STATS: 86400,          // 1 天
    USER_SETTINGS: 604800, // 7 天
    SEARCH: 1800,          // 30 分钟
}

/**
 * 生成缓存键
 */
export function cacheKey(type: string, ...parts: (string | number)[]): string {
    return `${KEY_PREFIX}${type}:${parts.join(':')}`
}

/**
 * 缓存服务
 */
export class CacheService {
    private redis: Redis | null

    constructor() {
        this.redis = getRedis()
    }

    /**
     * 获取缓存
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.redis) return null

        try {
            const data = await this.redis.get(key)
            if (data) {
                return JSON.parse(data) as T
            }
            return null
        } catch (error) {
            console.error('Cache get error:', error)
            return null
        }
    }

    /**
     * 设置缓存
     */
    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        if (!this.redis) return false

        try {
            const data = JSON.stringify(value)
            if (ttl) {
                await this.redis.setex(key, ttl, data)
            } else {
                await this.redis.set(key, data)
            }
            return true
        } catch (error) {
            console.error('Cache set error:', error)
            return false
        }
    }

    /**
     * 删除缓存
     */
    async del(key: string): Promise<boolean> {
        if (!this.redis) return false

        try {
            await this.redis.del(key)
            return true
        } catch (error) {
            console.error('Cache del error:', error)
            return false
        }
    }

    /**
     * 删除匹配模式的缓存
     */
    async deletePattern(pattern: string): Promise<boolean> {
        if (!this.redis) return false

        try {
            const keys = await this.redis.keys(pattern.startsWith(KEY_PREFIX) ? pattern : `${KEY_PREFIX}${pattern}`)
            if (keys.length > 0) {
                await this.redis.del(...keys)
            }
            return true
        } catch (error) {
            console.error('Cache deletePattern error:', error)
            return false
        }
    }

    /**
     * 删除匹配模式的缓存 (兼容旧代码中的 delPattern 命名)
     */
    async delPattern(pattern: string): Promise<boolean> {
        return this.deletePattern(pattern)
    }

    /**
     * 检查缓存是否存在
     */
    async exists(key: string): Promise<boolean> {
        if (!this.redis) return false

        try {
            const result = await this.redis.exists(key)
            return result === 1
        } catch (error) {
            console.error('Cache exists error:', error)
            return false
        }
    }

    /**
     * 获取缓存 TTL
     */
    async ttl(key: string): Promise<number> {
        if (!this.redis) return -1

        try {
            return await this.redis.ttl(key)
        } catch (error) {
            console.error('Cache ttl error:', error)
            return -1
        }
    }

    /**
     * 缓存日历数据
     */
    async cacheCalendar(userId: string, year: number, month: number, data: any): Promise<boolean> {
        const key = cacheKey('calendar', userId, year, month)
        return this.set(key, data, CacheTTL.CALENDAR)
    }

    /**
     * 获取日历缓存
     */
    async getCalendar(userId: string, year: number, month: number): Promise<any | null> {
        const key = cacheKey('calendar', userId, year, month)
        return this.get(key)
    }

    /**
     * 清除用户日历缓存
     */
    async clearCalendarCache(userId: string): Promise<boolean> {
        return this.delPattern(`calendar:${userId}:*`)
    }

    /**
     * 缓存记忆数据
     */
    async cacheMemory(userId: string, date: string, data: any): Promise<boolean> {
        const key = cacheKey('memory', userId, date)
        return this.set(key, data, CacheTTL.MEMORY)
    }

    /**
     * 获取记忆缓存
     */
    async getMemory(userId: string, date: string): Promise<any | null> {
        const key = cacheKey('memory', userId, date)
        return this.get(key)
    }

    /**
     * 清除记忆缓存
     */
    async clearMemoryCache(userId: string, date?: string): Promise<boolean> {
        if (date) {
            const key = cacheKey('memory', userId, date)
            return this.del(key)
        }
        return this.delPattern(`memory:${userId}:*`)
    }

    /**
     * 缓存统计数据
     */
    async cacheStats(userId: string, range: string, data: any): Promise<boolean> {
        const key = cacheKey('stats', userId, range)
        return this.set(key, data, CacheTTL.STATS)
    }

    /**
     * 获取统计缓存
     */
    async getStats(userId: string, range: string): Promise<any | null> {
        const key = cacheKey('stats', userId, range)
        return this.get(key)
    }

    /**
     * 清除统计缓存
     */
    async clearStatsCache(userId: string): Promise<boolean> {
        return this.delPattern(`stats:${userId}:*`)
    }

    /**
     * 缓存用户设置
     */
    async cacheUserSettings(userId: string, data: any): Promise<boolean> {
        const key = cacheKey('settings', userId)
        return this.set(key, data, CacheTTL.USER_SETTINGS)
    }

    /**
     * 获取用户设置缓存
     */
    async getUserSettings(userId: string): Promise<any | null> {
        const key = cacheKey('settings', userId)
        return this.get(key)
    }

    /**
     * 清除用户设置缓存
     */
    async clearUserSettingsCache(userId: string): Promise<boolean> {
        const key = cacheKey('settings', userId)
        return this.del(key)
    }

    /**
     * 清除用户所有缓存
     */
    async clearUserCache(userId: string): Promise<boolean> {
        try {
            await this.clearCalendarCache(userId)
            await this.clearMemoryCache(userId)
            await this.clearStatsCache(userId)
            await this.clearUserSettingsCache(userId)
            return true
        } catch (error) {
            console.error('Clear user cache error:', error)
            return false
        }
    }
}

export const cacheService = new CacheService()
