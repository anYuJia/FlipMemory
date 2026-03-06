/**
 * 记忆管理 Store
 * 使用离线优先 API，支持离线创建、查看和同步
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Memory, CalendarDay, MoodType, CreateMemoryInput } from '@/types'
import { offlineApi } from '@/services/offlineApi'
import { logger } from '@/services/logger'

const LOG_CONTEXT = 'MemoryStore'

export const useMemoryStore = defineStore('memory', () => {
    // ===== State =====
    const memories = ref<Map<string, Memory>>(new Map())
    const calendarDays = ref<Map<string, CalendarDay>>(new Map())
    const currentDate = ref<string>(formatDate(new Date()))
    const currentMonth = ref<{ year: number; month: number }>({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    })
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const recentMemories = ref<Memory[]>([])
    const searchResults = ref<Memory[]>([])

    // ===== Getters =====
    const currentMemory = computed(() => {
        return memories.value.get(currentDate.value) || null
    })

    const currentMonthDays = computed(() => {
        const { year, month } = currentMonth.value
        const days: CalendarDay[] = []
        const daysInMonth = new Date(year, month, 0).getDate()

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const calendarDay = calendarDays.value.get(date)
            days.push(calendarDay || {
                date,
                hasMemory: false,
                mood: null,
                thumbnailUrl: null,
            })
        }

        return days
    })

    const memoriesThisMonth = computed(() => {
        return currentMonthDays.value.filter(d => d.hasMemory).length
    })

    // ===== Actions =====
    function setCurrentDate(date: string) {
        currentDate.value = date
    }

    function setCurrentMonth(year: number, month: number) {
        currentMonth.value = { year, month }
    }

    function prevMonth() {
        const { year, month } = currentMonth.value
        if (month === 1) {
            currentMonth.value = { year: year - 1, month: 12 }
        } else {
            currentMonth.value = { year, month: month - 1 }
        }
    }

    function nextMonth() {
        const { year, month } = currentMonth.value
        if (month === 12) {
            currentMonth.value = { year: year + 1, month: 1 }
        } else {
            currentMonth.value = { year, month: month + 1 }
        }
    }

    /**
     * 获取日历数据（离线优先）
     */
    async function fetchCalendarData(year: number, month: number) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            const response = await offlineApi.memories.getCalendar(year, month)
            response.days.forEach((day: CalendarDay) => {
                calendarDays.value.set(day.date, day)
            })
            logger.debug(`获取日历数据成功: ${year}-${month}`, LOG_CONTEXT)
        } catch (e) {
            error.value = e instanceof Error ? e.message : '加载失败'
            logger.error('获取日历数据失败', LOG_CONTEXT, e)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 获取指定日期的记忆（离线优先）
     */
    async function fetchMemory(date: string) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            const memory = await offlineApi.memories.getByDate(date)
            if (memory) {
                memories.value.set(date, memory)
            }
            return memory
        } catch (e) {
            error.value = e instanceof Error ? e.message : '加载失败'
            logger.error(`获取记忆失败: ${date}`, LOG_CONTEXT, e)
            return null
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 创建记忆（支持离线）
     */
    async function createMemory(input: CreateMemoryInput) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API - 会自动处理离线情况
            const memory = await offlineApi.memories.create(input)
            memories.value.set(input.date, memory)
            calendarDays.value.set(input.date, {
                date: input.date,
                hasMemory: true,
                mood: input.mood || null,
                thumbnailUrl: null,
            })
            logger.info(`创建记忆成功: ${input.date}`, LOG_CONTEXT)
            return memory
        } catch (e) {
            error.value = e instanceof Error ? e.message : '创建失败'
            logger.error(`创建记忆失败: ${input.date}`, LOG_CONTEXT, e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 更新记忆（支持离线）
     */
    async function updateMemory(date: string, input: { content?: string; mood?: MoodType; isPrivate?: boolean; photoKeys?: string[] }) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            const memory = await offlineApi.memories.update(date, input)
            if (memory) {
                memories.value.set(date, memory)
                // 更新日历中的心情
                const existingDay = calendarDays.value.get(date)
                if (existingDay && input.mood !== undefined) {
                    calendarDays.value.set(date, {
                        ...existingDay,
                        mood: input.mood,
                    })
                }
            }
            logger.info(`更新记忆成功: ${date}`, LOG_CONTEXT)
            return memory
        } catch (e) {
            error.value = e instanceof Error ? e.message : '更新失败'
            logger.error(`更新记忆失败: ${date}`, LOG_CONTEXT, e)
            return null
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 删除记忆（支持离线）
     */
    async function deleteMemory(date: string) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            const success = await offlineApi.memories.delete(date)
            if (success) {
                memories.value.delete(date)
                calendarDays.value.delete(date)
            }
            logger.info(`删除记忆成功: ${date}`, LOG_CONTEXT)
            return success
        } catch (e) {
            error.value = e instanceof Error ? e.message : '删除失败'
            logger.error(`删除记忆失败: ${date}`, LOG_CONTEXT, e)
            return false
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 获取最近的记忆（离线优先）
     */
    async function fetchRecentMemories(limit = 10) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            recentMemories.value = await offlineApi.memories.getRecent(limit)
            return recentMemories.value
        } catch (e) {
            error.value = e instanceof Error ? e.message : '加载失败'
            logger.error('获取最近记忆失败', LOG_CONTEXT, e)
            return []
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 搜索记忆（离线时搜索本地缓存）
     */
    async function searchMemories(params: { q?: string; mood?: string; from?: string; to?: string }) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API - 离线时只能搜索本地缓存
            searchResults.value = await offlineApi.memories.search(params)
            return searchResults.value
        } catch (e) {
            error.value = e instanceof Error ? e.message : '搜索失败'
            logger.error('搜索记忆失败', LOG_CONTEXT, e)
            return []
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 获取回顾数据（离线优先）
     */
    async function getFlashback() {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API
            return await offlineApi.memories.getFlashback()
        } catch (e) {
            error.value = e instanceof Error ? e.message : '加载失败'
            logger.error('获取回顾数据失败', LOG_CONTEXT, e)
            return { yearAgo: null, random: [] }
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 获取统计数据（离线优先）
     */
    async function getStats(range?: string, year?: number, month?: number, week?: number) {
        isLoading.value = true
        error.value = null

        try {
            // 使用离线优先 API - 离线时返回本地计算的简单统计
            return await offlineApi.memories.getStats(range, year, month, week)
        } catch (e) {
            error.value = e instanceof Error ? e.message : '加载失败'
            logger.error('获取统计数据失败', LOG_CONTEXT, e)
            return null
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 清除内存中的缓存（不影响 IndexedDB）
     */
    function clearMemoryCache() {
        memories.value.clear()
        calendarDays.value.clear()
        recentMemories.value = []
        searchResults.value = []
    }

    return {
        // State
        memories,
        calendarDays,
        currentDate,
        currentMonth,
        isLoading,
        error,
        recentMemories,
        searchResults,
        // Getters
        currentMemory,
        currentMonthDays,
        memoriesThisMonth,
        // Actions
        setCurrentDate,
        setCurrentMonth,
        prevMonth,
        nextMonth,
        fetchCalendarData,
        fetchMemory,
        createMemory,
        updateMemory,
        deleteMemory,
        fetchRecentMemories,
        searchMemories,
        getFlashback,
        getStats,
        clearMemoryCache,
    }
})

// 辅助函数
function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
