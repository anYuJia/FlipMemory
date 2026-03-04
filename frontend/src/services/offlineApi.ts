/**
 * 离线优先的 API 包装器
 * 在线时使用网络请求并缓存，离线时使用本地缓存
 */
import { db, generateTempId, type LocalMemory, type LocalCalendarDay, type SyncStatus } from '@/services/db'
import api from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import { AppError, logError } from '@/utils/errorHandler'
import type { Memory, CalendarDay, CreateMemoryInput, MoodType } from '@/types'

/**
 * 将服务器记忆转换为本地记忆格式
 */
function toLocalMemory(memory: Memory, syncStatus: SyncStatus = 'synced'): LocalMemory {
    return {
        ...memory,
        _syncStatus: syncStatus,
        _localUpdatedAt: Date.now(),
        _isTemp: false,
    }
}

/**
 * 将本地记忆转换为服务器记忆格式
 */
function toServerMemory(localMemory: LocalMemory): Memory {
    const { _syncStatus, _localUpdatedAt, _serverVersion, _isTemp, ...memory } = localMemory
    return memory as Memory
}

/**
 * 判断在线请求失败后是否应该回退到离线队列
 * 仅网络异常/可重试错误回退，业务类 4xx 错误不应入队
 */
function shouldFallbackToOffline(error: unknown): boolean {
    if (error instanceof AppError) {
        return error.isRetryable || error.code === 0 || error.code >= 500 || error.code === 408 || error.code === 429
    }

    if (error instanceof TypeError) {
        return true
    }

    return false
}

/**
 * 安全的 API 调用包装器
 */
async function safeApiCall<T>(
    fn: () => Promise<T>,
    fallback: T,
    context: string
): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        logError(error, `OfflineAPI: ${context}`)
        return fallback
    }
}

/**
 * 离线优先的 API
 */
export const offlineApi = {
    memories: {
        /**
         * 获取日历数据（离线优先）
         */
        async getCalendar(year: number, month: number): Promise<{ days: CalendarDay[] }> {
            const offlineStore = useOfflineStore()

            // 如果在线且未开启离线模式，尝试从服务器获取
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                const response = await safeApiCall(
                    () => api.memories.getCalendar(year, month),
                    null,
                    'getCalendar'
                )

                if (response) {
                    // 缓存到本地
                    const localDays: LocalCalendarDay[] = response.days.map((day: CalendarDay) => ({
                        ...day,
                        _cachedAt: Date.now(),
                    }))
                    await offlineStore.saveLocalCalendarDays(localDays)
                    return response
                }
            }

            // 从本地缓存获取
            const localDays = await offlineStore.getLocalCalendarDays(year, month)
            return {
                days: localDays.map(({ _cachedAt, ...day }) => day as CalendarDay)
            }
        },

        /**
         * 获取指定日期的记忆（离线优先）
         */
        async getByDate(date: string): Promise<Memory | null> {
            const offlineStore = useOfflineStore()

            // 优先检查本地是否有待同步的数据
            const localMemory = await offlineStore.getLocalMemory(date)
            if (localMemory && localMemory._syncStatus === 'pending') {
                // 如果有待同步的本地数据，直接返回
                return toServerMemory(localMemory)
            }

            // 如果在线且未开启离线模式，从服务器获取
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                const memory = await safeApiCall(
                    () => api.memories.getByDate(date),
                    null,
                    'getByDate'
                )

                if (memory) {
                    // 缓存到本地
                    await offlineStore.saveLocalMemory(toLocalMemory(memory))
                    return memory
                }
            }

            // 从本地缓存获取
            if (localMemory) {
                return toServerMemory(localMemory)
            }

            return null
        },

        /**
         * 创建记忆（支持离线）
         */
        async create(input: CreateMemoryInput): Promise<Memory> {
            const offlineStore = useOfflineStore()
            const { localPhotos, ...serverInput } = input

            // 生成临时 ID
            const tempId = generateTempId()
            const now = new Date().toISOString()

            // 构建本地记忆对象
            const localMemory: LocalMemory = {
                id: tempId,
                date: input.date,
                content: input.content || null,
                mood: (input.mood as MoodType) || null,
                isPrivate: false,
                weather: input.weather || null,
                location: input.location || null,
                photos: (localPhotos || []).map((photo) => ({
                    id: photo.id,
                    key: photo.key ?? null,
                    originalUrl: photo.originalUrl,
                    thumbnailUrl: photo.thumbnailUrl,
                    mediumUrl: photo.mediumUrl,
                    takenAt: photo.takenAt || null,
                    width: photo.width ?? null,
                    height: photo.height ?? null,
                    order: photo.order ?? 0,
                })),
                tags: [],
                createdAt: now,
                updatedAt: now,
                _syncStatus: 'pending',
                _localUpdatedAt: Date.now(),
                _isTemp: true,
            }

            // 如果在线且未开启离线模式，尝试直接创建
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    const memory = await api.memories.create(serverInput)

                    // 保存到本地缓存
                    await offlineStore.saveLocalMemory(toLocalMemory(memory))

                    // 更新日历缓存
                    await offlineStore.updateLocalCalendarDay({
                        date: input.date,
                        hasMemory: true,
                        mood: (input.mood as MoodType) || null,
                        thumbnailUrl: null,
                        _cachedAt: Date.now(),
                    })

                    return memory
                } catch (error) {
                    if (!shouldFallbackToOffline(error)) throw error
                    console.warn('[OfflineAPI] Failed to create on server, saving locally:', error)
                }
            }

            // 离线模式或请求失败：保存到本地并加入同步队列
            await offlineStore.saveLocalMemory(localMemory)
            await offlineStore.addToSyncQueue({
                type: 'create',
                entityType: 'memory',
                entityId: tempId,
                data: serverInput,
            })

            // 更新日历缓存
            await offlineStore.updateLocalCalendarDay({
                date: input.date,
                hasMemory: true,
                mood: (input.mood as MoodType) || null,
                thumbnailUrl: null,
                _cachedAt: Date.now(),
            })

            return toServerMemory(localMemory)
        },

        /**
         * 更新记忆（支持离线）
         */
        async update(date: string, input: Partial<{
            content: string
            mood: MoodType
            isPrivate: boolean
            tags: string[]
        }>): Promise<Memory | null> {
            const offlineStore = useOfflineStore()

            // 获取现有记忆
            const existing = await offlineStore.getLocalMemory(date)
            if (!existing) {
                // 如果本地没有，尝试从服务器获取
                const serverMemory = await this.getByDate(date)
                if (!serverMemory) {
                    return null
                }
                // 保存到本地后再更新
                await offlineStore.saveLocalMemory(toLocalMemory(serverMemory))
                return this.update(date, input)
            }

            // 构建更新后的记忆（注意：tags 需要单独处理，因为输入是 string[] 而本地存储是 LocalTag[]）
            const { tags: inputTags, ...restInput } = input
            const updatedMemory: LocalMemory = {
                ...existing,
                ...restInput,
                updatedAt: new Date().toISOString(),
                _localUpdatedAt: Date.now(),
            }

            // 如果在线且未开启离线模式，尝试直接更新
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    const memory = await api.memories.update(date, input)
                    await offlineStore.saveLocalMemory(toLocalMemory(memory))

                    // 更新日历缓存
                    if (input.mood !== undefined) {
                        await offlineStore.updateLocalCalendarDay({
                            date,
                            hasMemory: true,
                            mood: input.mood,
                            thumbnailUrl: null,
                            _cachedAt: Date.now(),
                        })
                    }

                    return memory
                } catch (error) {
                    if (!shouldFallbackToOffline(error)) throw error
                    console.warn('[OfflineAPI] Failed to update on server, saving locally:', error)
                }
            }

            // 离线模式或请求失败
            updatedMemory._syncStatus = 'pending'
            await offlineStore.saveLocalMemory(updatedMemory)
            await offlineStore.addToSyncQueue({
                type: 'update',
                entityType: 'memory',
                entityId: date,
                data: input,
            })

            return toServerMemory(updatedMemory)
        },

        /**
         * 删除记忆（支持离线）
         */
        async delete(date: string): Promise<boolean> {
            const offlineStore = useOfflineStore()

            const existing = await offlineStore.getLocalMemory(date)

            // 如果在线且未开启离线模式，尝试直接删除
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    await api.memories.delete(date)

                    // 从本地删除
                    await offlineStore.deleteLocalMemory(date)

                    // 更新日历缓存
                    await db.calendarDays.delete(date)

                    return true
                } catch (error) {
                    if (!shouldFallbackToOffline(error)) throw error
                    console.warn('[OfflineAPI] Failed to delete on server, marking for deletion:', error)
                }
            }

            // 离线模式或请求失败
            if (existing) {
                // 如果是临时创建的记忆（还未同步到服务器），直接删除
                if (existing._isTemp) {
                    await offlineStore.deleteLocalMemory(date)
                    // 同时删除对应的同步队列项
                    const syncOps = await db.syncQueue
                        .where('entityId')
                        .equals(existing.id)
                        .toArray()
                    for (const op of syncOps) {
                        if (op.id) await db.syncQueue.delete(op.id)
                    }
                } else {
                    // 已同步的记忆，标记删除并加入同步队列
                    await offlineStore.deleteLocalMemory(date)
                    await offlineStore.addToSyncQueue({
                        type: 'delete',
                        entityType: 'memory',
                        entityId: date,
                        data: { date },
                    })
                }
            }

            // 更新日历缓存
            await db.calendarDays.delete(date)

            return true
        },

        /**
         * 获取最近的记忆列表
         * 注意：这个方法在离线时返回本地缓存的数据，可能不完整
         */
        async getRecent(limit: number = 10): Promise<Memory[]> {
            const offlineStore = useOfflineStore()

            // 如果在线，从服务器获取
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    const memories = await api.memories.getRecent(limit)

                    // 缓存到本地
                    const localMemories = memories.map((m: Memory) => toLocalMemory(m))
                    await offlineStore.bulkSaveMemories(localMemories)

                    return memories
                } catch (error) {
                    console.warn('[OfflineAPI] Failed to fetch recent memories, falling back to cache:', error)
                }
            }

            // 从本地获取最近的记忆
            const localMemories = await db.memories
                .orderBy('date')
                .reverse()
                .limit(limit)
                .toArray()

            return localMemories.map(toServerMemory)
        },

        /**
         * 搜索记忆
         * 注意：离线时只能搜索本地缓存的数据
         */
        async search(params: {
            q?: string
            mood?: string
            from?: string
            to?: string
            limit?: number
        }): Promise<Memory[]> {
            const offlineStore = useOfflineStore()

            // 如果在线，从服务器搜索
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    return await api.memories.search(params)
                } catch (error) {
                    console.warn('[OfflineAPI] Failed to search on server, falling back to local:', error)
                }
            }

            // 本地搜索（简单实现）
            let query = db.memories.orderBy('date').reverse()

            // 按日期范围过滤
            const results = await query.toArray()

            return results
                .filter(m => {
                    if (params.from && m.date < params.from) return false
                    if (params.to && m.date > params.to) return false
                    if (params.mood && m.mood !== params.mood) return false
                    if (params.q) {
                        const searchText = params.q.toLowerCase()
                        if (!m.content?.toLowerCase().includes(searchText)) {
                            return false
                        }
                    }
                    return true
                })
                .slice(0, params.limit || 20)
                .map(toServerMemory)
        },

        /**
         * 获取回顾数据
         */
        async getFlashback(): Promise<{ yearAgo: Memory | null; random: Memory[] }> {
            const offlineStore = useOfflineStore()

            // 如果在线，从服务器获取（限时 5 秒，避免重试导致长时间等待）
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    const result = await Promise.race([
                        api.memories.getFlashback(),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Flashback API timeout')), 5000)
                        ),
                    ])
                    return result
                } catch (error) {
                    console.warn('[OfflineAPI] Failed to fetch flashback, falling back to local:', error)
                }
            }

            // 本地计算回顾数据
            const today = new Date()
            const yearAgoDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
            const yearAgoStr = yearAgoDate.toISOString().split('T')[0]

            let yearAgoMemory = null
            if (yearAgoStr) {
                yearAgoMemory = await db.memories.get(yearAgoStr) || null
            }

            // 获取随机记忆
            const allMemories = await db.memories.toArray()
            const shuffled = allMemories.sort(() => Math.random() - 0.5)
            const random = shuffled.slice(0, 5).map(toServerMemory)

            return {
                yearAgo: yearAgoMemory ? toServerMemory(yearAgoMemory) : null,
                random,
            }
        },

        /**
         * 获取统计数据
         */
        async getStats(range?: string, year?: number, month?: number, week?: number) {
            const offlineStore = useOfflineStore()

            // 如果在线，从服务器获取
            if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
                try {
                    return await api.memories.getStats(range, year, month, week)
                } catch (error) {
                    console.warn('[OfflineAPI] Failed to fetch stats, falling back to local:', error)
                }
            }

            // 本地计算简单统计
            const memories = await db.memories.toArray()
            const moodCounts: Record<string, number> = {}

            for (const m of memories) {
                if (m.mood) {
                    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1
                }
            }

            return {
                totalMemories: memories.length,
                moodDistribution: moodCounts,
                // 其他统计数据在离线时可能不准确
            }
        },
    },
}

export default offlineApi
