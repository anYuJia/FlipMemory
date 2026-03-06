import { prisma, env, minioClient } from '../../shared/config/index.js'
import { cacheService, CacheTTL } from '../../shared/config/redis.js'
import type { CreateMemoryInput, UpdateMemoryInput } from './memory.schema.js'

export class MemoryService {
    // 缓存 URL 前缀，避免每次拼接
    private readonly photoUrlPrefix: string

    constructor() {
        const proto = env.minio.useSSL ? 'https' : 'http'
        this.photoUrlPrefix = `${proto}://${env.minio.publicEndpoint}:${env.minio.publicPort}/${env.minio.bucket}/`
    }

    // 缓存 key 生成
    private getCacheKey(type: string, userId: string, ...args: (string | number)[]) {
        return `memory:${type}:${userId}:${args.join(':')}`
    }

    // 清除用户相关缓存（含 stats、calendar 等）
    private async invalidateUserCache(userId: string) {
        await cacheService.clearUserCache(userId)
    }

    // 获取月度日历数据
    async getCalendarData(userId: string, year: number, month: number) {
        const cacheKey = this.getCacheKey('calendar', userId, year, month)

        // 尝试从缓存获取
        const cached = await cacheService.get<any[]>(cacheKey)
        if (cached) return cached

        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)

        const memories = await prisma.memory.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                date: true,
                mood: true,
                photos: {
                    take: 1,
                    select: {
                        thumbnailKey: true,
                    },
                },
            },
        })

        const result = memories.map((m) => ({
            date: m.date.toISOString().split('T')[0],
            hasMemory: true,
            mood: m.mood,
            thumbnailUrl: m.photos[0]
                ? this.getPhotoUrl(m.photos[0].thumbnailKey)
                : null,
        }))

        // 缓存结果（1小时，写入时自动清除）
        await cacheService.set(cacheKey, result, CacheTTL.CALENDAR)
        return result
    }

    // 获取指定日期的记忆
    async getMemoryByDate(userId: string, date: string) {
        const memory = await prisma.memory.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: new Date(date),
                },
            },
            include: {
                photos: {
                    orderBy: { order: 'asc' },
                },
                tags: {
                    include: { tag: true },
                },
            },
        })

        if (!memory) return null

        return {
            ...memory,
            date: memory.date.toISOString().split('T')[0],
            photos: memory.photos.map((p) => ({
                id: p.id,
                originalUrl: this.getPhotoUrl(p.originalKey),
                thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                mediumUrl: this.getPhotoUrl(p.mediumKey),
                takenAt: p.takenAt?.toISOString() || null,
                width: p.width,
                height: p.height,
                order: p.order,
            })),
            tags: memory.tags.map((t) => t.tag),
        }
    }

    // 创建或更新记忆 (upsert)
    async createMemory(userId: string, input: CreateMemoryInput) {
        const { date, photoKeys, photos, tags, ...data } = input

        // 构建照片创建数据
        const derivePhotoKeys = (key: string) => {
            const thumbnailKey = key.replace('/original/', '/thumbnail/')
            const mediumKey = key.replace('/original/', '/medium/')
            return { originalKey: key, thumbnailKey, mediumKey }
        }

        const photoCreateData = photos?.map((p, index) => ({
            ...derivePhotoKeys(p.key),
            takenAt: p.takenAt ? new Date(p.takenAt) : null,
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            width: p.width ?? null,
            height: p.height ?? null,
            order: index,
        })) ?? photoKeys?.map((key, index) => ({
            ...derivePhotoKeys(key),
            order: index,
        }))

        // Use transaction to prevent race conditions on concurrent creates for same date
        const result = await prisma.$transaction(async (tx) => {
            // 检查是否已存在记忆
            const existingMemory = await tx.memory.findUnique({
                where: {
                    userId_date: {
                        userId,
                        date: new Date(date),
                    },
                },
                include: {
                    photos: true,
                },
            })

            if (existingMemory) {
                // 更新现有记忆
                if (photoCreateData && photoCreateData.length > 0) {
                    await tx.photo.deleteMany({
                        where: { memoryId: existingMemory.id },
                    })
                }

                const memory = await tx.memory.update({
                    where: {
                        userId_date: {
                            userId,
                            date: new Date(date),
                        },
                    },
                    data: {
                        ...data,
                        photos: photoCreateData
                            ? {
                                create: photoCreateData,
                            }
                            : undefined,
                    },
                    include: {
                        photos: true,
                    },
                })

                return {
                    ...memory,
                    date: memory.date.toISOString().split('T')[0],
                    photos: memory.photos.map((p) => ({
                        id: p.id,
                        originalUrl: this.getPhotoUrl(p.originalKey),
                        thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                        mediumUrl: this.getPhotoUrl(p.mediumKey),
                        takenAt: p.takenAt?.toISOString() || null,
                        width: p.width,
                        height: p.height,
                        order: p.order,
                    })),
                }
            } else {
                // 创建新记忆
                const memory = await tx.memory.create({
                    data: {
                        userId,
                        date: new Date(date),
                        ...data,
                        photos: photoCreateData
                            ? {
                                create: photoCreateData,
                            }
                            : undefined,
                    },
                    include: {
                        photos: true,
                    },
                })

                return {
                    ...memory,
                    date: memory.date.toISOString().split('T')[0],
                    photos: memory.photos.map((p) => ({
                        id: p.id,
                        originalUrl: this.getPhotoUrl(p.originalKey),
                        thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                        mediumUrl: this.getPhotoUrl(p.mediumKey),
                        takenAt: p.takenAt?.toISOString() || null,
                        width: p.width,
                        height: p.height,
                        order: p.order,
                    })),
                }
            }
        })

        // 创建/更新后清除缓存
        await this.invalidateUserCache(userId)

        return result
    }

    // 更新记忆
    async updateMemory(userId: string, date: string, input: UpdateMemoryInput) {
        const { tags, photoKeys, photos, ...data } = input

        // 构建新照片创建数据
        const derivePhotoKeys = (key: string) => {
            const thumbnailKey = key.replace('/original/', '/thumbnail/')
            const mediumKey = key.replace('/original/', '/medium/')
            return { originalKey: key, thumbnailKey, mediumKey }
        }

        // 获取当前最大 order
        const existingPhotos = await prisma.photo.findMany({
            where: { memory: { userId, date: new Date(date) } },
            orderBy: { order: 'desc' },
            take: 1,
        })
        const nextOrder = (existingPhotos[0]?.order ?? -1) + 1

        const newPhotoData = photos?.map((p, index) => ({
            ...derivePhotoKeys(p.key),
            takenAt: p.takenAt ? new Date(p.takenAt) : null,
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            width: p.width ?? null,
            height: p.height ?? null,
            order: nextOrder + index,
        })) ?? photoKeys?.map((key, index) => ({
            ...derivePhotoKeys(key),
            order: nextOrder + index,
        }))

        const memory = await prisma.memory.update({
            where: {
                userId_date: {
                    userId,
                    date: new Date(date),
                },
            },
            data: {
                ...data,
                photos: newPhotoData && newPhotoData.length > 0
                    ? { create: newPhotoData }
                    : undefined,
            },
            include: {
                photos: {
                    orderBy: { order: 'asc' },
                },
            },
        })

        // 清除缓存
        await this.invalidateUserCache(userId)

        return {
            ...memory,
            date: memory.date.toISOString().split('T')[0],
            photos: memory.photos.map((p) => ({
                id: p.id,
                originalUrl: this.getPhotoUrl(p.originalKey),
                thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                mediumUrl: this.getPhotoUrl(p.mediumKey),
                takenAt: p.takenAt?.toISOString() || null,
                width: p.width,
                height: p.height,
                order: p.order,
            })),
        }
    }

    // 删除记忆
    async deleteMemory(userId: string, date: string) {
        // 先获取照片信息用于清理存储
        const memory = await prisma.memory.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: new Date(date),
                },
            },
            include: { photos: true },
        })

        if (!memory) {
            throw new Error('Memory not found')
        }

        // 删除记忆（照片会级联删除）
        await prisma.memory.delete({
            where: {
                userId_date: {
                    userId,
                    date: new Date(date),
                },
            },
        })

        // 清除缓存
        await this.invalidateUserCache(userId)

        // Clean up MinIO photo objects
        if (memory.photos.length > 0) {
            const photoKeys = memory.photos.flatMap(p => [
                p.originalKey,
                p.thumbnailKey,
                p.mediumKey,
            ])
            try {
                await Promise.all(
                    photoKeys.map(key =>
                        minioClient.removeObject(env.minio.bucket, key)
                    )
                )
            } catch (err) {
                // Log but don't fail the delete operation
                console.error('Failed to clean up MinIO objects:', err)
            }
        }

        return true
    }

    // 获取回顾记忆
    async getFlashbackMemories(userId: string) {
        const today = new Date()
        const oneYearAgo = new Date(today)
        oneYearAgo.setFullYear(today.getFullYear() - 1)

        // 一年前的今天
        const yearAgoMemory = await prisma.memory.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: new Date(oneYearAgo.toISOString().split('T')[0]),
                },
            },
            include: { photos: true },
        })

        // 随机记忆 - 使用安全参数化查询
        const randomMemories = await prisma.$queryRaw<any[]>`
            SELECT m.*, 
                   (SELECT json_agg(p.*) FROM photos p WHERE p."memoryId" = m.id) as photos
            FROM memories m
            WHERE m."userId" = ${userId}
            ORDER BY RANDOM()
            LIMIT 5
        `

        return {
            yearAgo: yearAgoMemory
                ? {
                    ...yearAgoMemory,
                    date: yearAgoMemory.date.toISOString().split('T')[0],
                    photos: yearAgoMemory.photos.map((p) => ({
                        id: p.id,
                        originalUrl: this.getPhotoUrl(p.originalKey),
                        thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                        mediumUrl: this.getPhotoUrl(p.mediumKey),
                    })),
                }
                : null,
            random: randomMemories.map((m) => ({
                ...m,
                date: m.date instanceof Date ? m.date.toISOString().split('T')[0] : m.date,
                photos: (m.photos || []).map((p: any) => ({
                    id: p.id,
                    originalUrl: this.getPhotoUrl(p.originalKey),
                    thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                    mediumUrl: this.getPhotoUrl(p.mediumKey),
                })),
            })),
        }
    }

    // 获取统计数据
    async getStats(userId: string, range: string = 'all', year?: number, month?: number, week?: number) {
        const now = new Date()
        const targetYear = year || now.getFullYear()
        const targetMonth = month || (now.getMonth() + 1)

        // 基础统计 - 优化：并行执行
        const [totalMemories, totalPhotos, moodCounts, consecutiveDays] = await Promise.all([
            prisma.memory.count({ where: { userId } }),
            prisma.photo.count({
                where: { memory: { userId } },
            }),
            prisma.memory.groupBy({
                by: ['mood'],
                where: { userId, mood: { not: null } },
                _count: { mood: true },
            }),
            this.calculateStreak(userId)
        ])

        // 本期统计 (periodCount)
        let periodStartDate: Date
        let periodEndDate: Date

        if (range === 'week' && week) {
            // 获取指定周的起始日期
            const startOfYear = new Date(targetYear, 0, 1)
            const daysOffset = (week - 1) * 7 - startOfYear.getDay()
            periodStartDate = new Date(targetYear, 0, 1 + daysOffset)
            periodStartDate.setHours(0, 0, 0, 0)

            periodEndDate = new Date(periodStartDate)
            periodEndDate.setDate(periodEndDate.getDate() + 6)
            periodEndDate.setHours(23, 59, 59, 999)
        } else if (range === 'year') {
            periodStartDate = new Date(targetYear, 0, 1)
            periodEndDate = new Date(targetYear, 11, 31, 23, 59, 59, 999)
        } else if (range === 'month') {
            periodStartDate = new Date(targetYear, targetMonth - 1, 1)
            periodEndDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999)
        } else {
            // all -> 默认显示本月
            periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
            periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        }

        const periodCount = await prisma.memory.count({
            where: {
                userId,
                date: {
                    gte: periodStartDate,
                    lte: periodEndDate,
                }
            }
        })

        // 趋势数据 - 优化：使用安全参数化查询
        let trend: { label: string, count: number }[] = []

        if (range === 'all') {
            // 年度趋势: 过去 5 年
            const startYear = now.getFullYear() - 4
            const years = Array.from({ length: 5 }, (_, i) => startYear + i)

            const results = await prisma.$queryRaw<any[]>`
                SELECT CAST(EXTRACT(YEAR FROM date) AS INTEGER) as val, CAST(COUNT(*) AS INTEGER) as count
                FROM memories
                WHERE "userId" = ${userId} AND EXTRACT(YEAR FROM date) >= ${startYear}
                GROUP BY EXTRACT(YEAR FROM date)
                ORDER BY EXTRACT(YEAR FROM date) ASC
            `

            trend = years.map(y => ({
                label: y.toString(),
                count: Number(results.find(r => Number(r.val) === y)?.count || 0)
            }))
        } else if (range === 'year') {
            // 月度趋势: 该年 12 个月
            const months = Array.from({ length: 12 }, (_, i) => i + 1)
            const results = await prisma.$queryRaw<any[]>`
                SELECT CAST(EXTRACT(MONTH FROM date) AS INTEGER) as val, CAST(COUNT(*) AS INTEGER) as count
                FROM memories
                WHERE "userId" = ${userId} AND EXTRACT(YEAR FROM date) = ${targetYear}
                GROUP BY EXTRACT(MONTH FROM date)
                ORDER BY EXTRACT(MONTH FROM date) ASC
            `

            trend = months.map(m => {
                const found = results.find(r => Number(r.val) === m)
                return {
                    label: `${m}月`,
                    count: found ? Number(found.count) : 0
                }
            })
        }
        else if (range === 'month') {
            // 每日趋势：用 SQL 直接按天聚合
            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()

            const results = await prisma.$queryRaw<{ day: number; count: number }[]>`
                SELECT EXTRACT(DAY FROM date)::int AS day, COUNT(*)::int AS count
                FROM memories
                WHERE "userId" = ${userId}
                  AND date >= ${new Date(targetYear, targetMonth - 1, 1)}
                  AND date <= ${new Date(targetYear, targetMonth, 0)}
                GROUP BY EXTRACT(DAY FROM date)
            `

            const countMap: Map<number, number> = new Map(results.map(r => [Number(r.day), Number(r.count)]))
            trend = Array.from({ length: daysInMonth }, (_, i) => ({
                label: (i + 1).toString(),
                count: countMap.get(i + 1) ?? 0,
            }))
        } else if (range === 'week') {
            // 每日趋势: 该周 7 天，用 SQL 聚合
            const daysShort = ['日', '一', '二', '三', '四', '五', '六']

            const results = await prisma.$queryRaw<{ d: Date; count: number }[]>`
                SELECT date::date AS d, COUNT(*)::int AS count
                FROM memories
                WHERE "userId" = ${userId}
                  AND date >= ${periodStartDate}
                  AND date <= ${periodEndDate}
                GROUP BY date::date
            `

            const countMap: Map<string, number> = new Map(results.map(r => [new Date(r.d).toISOString().split('T')[0], Number(r.count)]))
            trend = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(periodStartDate)
                d.setDate(d.getDate() + i)
                const dateStr = d.toISOString().split('T')[0]
                return {
                    label: daysShort[d.getDay()],
                    count: countMap.get(dateStr) ?? 0
                }
            })
        }

        return {
            totalMemories,
            totalPhotos,
            consecutiveDays,
            periodCount,
            moodDistribution: moodCounts.map((m) => ({
                mood: m.mood,
                count: m._count.mood,
            })),
            trend
        }
    }

    private async calculateStreak(userId: string): Promise<number> {
        // 用 SQL 直接计算连续天数，避免加载大量数据到 JS
        const result = await prisma.$queryRaw<{ streak: number }[]>`
            WITH dates AS (
                SELECT DISTINCT date::date AS d
                FROM memories
                WHERE "userId" = ${userId}
            ),
            ranked AS (
                SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
                FROM dates
            ),
            streaks AS (
                SELECT grp, MIN(d) AS start_date, MAX(d) AS end_date, COUNT(*)::int AS streak
                FROM ranked
                GROUP BY grp
            )
            SELECT COALESCE(streak, 0) AS streak
            FROM streaks
            WHERE end_date >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY streak DESC
            LIMIT 1
        `
        return result[0]?.streak ?? 0
    }

    // 搜索记忆
    async searchMemories(userId: string, query?: string, mood?: string, from?: string, to?: string, limit = 20, skip = 0) {
        const where: any = { userId }

        // 关键词搜索
        if (query) {
            where.content = { contains: query, mode: 'insensitive' }
        }

        // 心情筛选
        if (mood) {
            where.mood = mood
        }

        // 日期范围
        if (from || to) {
            where.date = {}
            if (from) where.date.gte = new Date(from)
            if (to) where.date.lte = new Date(to)
        }

        const memories = await prisma.memory.findMany({
            where,
            take: limit,
            skip,
            orderBy: { date: 'desc' },
            include: {
                photos: { take: 1 },
                tags: { include: { tag: true } },
            },
        })

        return memories.map((m) => ({
            ...m,
            date: m.date.toISOString().split('T')[0],
            photos: m.photos.map((p) => ({
                id: p.id,
                thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
            })),
            tags: m.tags.map((t) => t.tag),
        }))
    }

    // 获取最近记忆
    async getRecentMemories(userId: string, limit = 10, offset = 0) {
        const memories = await prisma.memory.findMany({
            where: { userId },
            take: limit,
            skip: offset,
            orderBy: { date: 'desc' },
            include: {
                photos: { orderBy: { order: 'asc' }, take: 20 },
                tags: { include: { tag: true }, take: 10 },
            },
        })

        return memories.map((m) => ({
            ...m,
            date: m.date.toISOString().split('T')[0],
            photos: m.photos.map((p) => ({
                id: p.id,
                originalUrl: this.getPhotoUrl(p.originalKey),
                thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
                mediumUrl: this.getPhotoUrl(p.mediumKey),
                takenAt: p.takenAt?.toISOString() || null,
                width: p.width,
                height: p.height,
                order: p.order,
            })),
            tags: m.tags.map((t) => t.tag),
        }))
    }

    // 获取纪念日记忆（今天的历史记录）
    async getAnniversaryMemories(userId: string) {
        const today = new Date()
        const month = today.getMonth() + 1
        const day = today.getDate()

        // 优化：使用 Raw SQL 直接在数据库中过滤月和日
        // 这样可以避免从数据库中取出所有记忆并在 JS 中过滤
        const memories = await prisma.$queryRaw<any[]>`
            SELECT m.*,
                   (SELECT json_agg(p.*) FROM photos p WHERE p."memoryId" = m.id LIMIT 1) as photos
            FROM memories m
            WHERE m."userId" = ${userId}
              AND EXTRACT(MONTH FROM m.date) = ${month}
              AND EXTRACT(DAY FROM m.date) = ${day}
              AND EXTRACT(YEAR FROM m.date) < ${today.getFullYear()}
            ORDER BY m.date DESC
            LIMIT 20
        `

        return memories.map((m) => ({
            ...m,
            date: m.date instanceof Date ? m.date.toISOString().split('T')[0] : m.date,
            yearsAgo: today.getFullYear() - (m.date instanceof Date ? m.date.getFullYear() : new Date(m.date).getFullYear()),
            photos: (m.photos || []).map((p: any) => ({
                id: p.id,
                thumbnailUrl: this.getPhotoUrl(p.thumbnailKey),
            })),
        }))
    }


    // 生成照片 URL
    private getPhotoUrl(key: string): string {
        return `${this.photoUrlPrefix}${key}`
    }
}

export const memoryService = new MemoryService()
