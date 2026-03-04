/**
 * 离线状态管理 Store
 * 管理网络状态、同步队列、本地缓存
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useOnline, useStorage } from '@vueuse/core'
import {
    db,
    type LocalMemory,
    type LocalCalendarDay,
    type SyncOperation,
    type SyncStatus,
    getStorageEstimate,
    formatStorageSize,
} from '@/services/db'
import api from '@/services/api'
import { offlinePhotoService } from '@/services/offlinePhotoService'
import { logger } from '@/services/logger'

const LOG_CONTEXT = 'OfflineStore'

export const useOfflineStore = defineStore('offline', () => {
    // ===== 状态 =====

    // 网络状态（使用 VueUse 的响应式检测）
    const isOnline = useOnline()

    // 同步状态
    const isSyncing = ref(false)
    const syncProgress = ref(0)
    const lastSyncTime = useStorage<number | null>('flipMemory_lastSyncTime', null)
    const pendingOperationsCount = ref(0)
    const pendingPhotosCount = ref(0)  // 新增：待上传图片数量
    const syncError = ref<string | null>(null)

    // 离线模式设置（用户可手动开启以节省流量）
    const offlineModeEnabled = useStorage('flipMemory_offlineModeEnabled', false)

    // 初始化状态
    const isInitialized = ref(false)

    // ===== 计算属性 =====

    /**
     * 是否处于有效的离线模式
     * 当网络断开或用户主动开启离线模式时为 true
     */
    const isOfflineMode = computed(() => {
        return !isOnline.value || offlineModeEnabled.value
    })

    /**
     * 是否有待同步的数据（包括记忆和图片）
     */
    const hasPendingSync = computed(() => pendingOperationsCount.value > 0 || pendingPhotosCount.value > 0)

    /**
     * 总待同步项数量
     */
    const totalPendingCount = computed(() => pendingOperationsCount.value + pendingPhotosCount.value)

    /**
     * 综合同步状态
     */
    const syncStatus = computed<'syncing' | 'offline' | 'pending' | 'synced' | 'error'>(() => {
        if (syncError.value) return 'error'
        if (isSyncing.value) return 'syncing'
        if (!isOnline.value) return 'offline'
        if (pendingOperationsCount.value > 0 || pendingPhotosCount.value > 0) return 'pending'
        return 'synced'
    })

    // ===== 初始化 =====

    /**
     * 初始化离线 Store
     */
    async function init() {
        if (isInitialized.value) return

        try {
            // 更新待同步数量
            await updatePendingCount()

            // 监听网络状态变化
            watch(isOnline, async (online) => {
                if (online && hasPendingSync.value && !offlineModeEnabled.value) {
                    // 网络恢复且有待同步数据，自动开始同步
                    await syncPendingOperations()
                }
            })

            // 监听手动离线模式开关：用户关闭离线模式后，若在线则立即补同步
            watch(offlineModeEnabled, async (enabled) => {
                if (!enabled && isOnline.value && hasPendingSync.value) {
                    await syncPendingOperations()
                }
            })

            // 监听来自 Service Worker 的同步消息
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data?.type === 'SYNC_TRIGGERED') {
                        syncPendingOperations()
                    }
                })
            }

            // 初始化时若已经联网且存在历史待同步数据，也应立即触发补同步
            if (isOnline.value && hasPendingSync.value && !offlineModeEnabled.value) {
                await syncPendingOperations()
            }

            isInitialized.value = true
            logger.info('离线 Store 初始化完成', LOG_CONTEXT)
        } catch (error) {
            logger.error('离线 Store 初始化失败', LOG_CONTEXT, error)
        }
    }

    /**
     * 更新待同步操作数量（包括图片）
     */
    async function updatePendingCount() {
        try {
            const [operationsCount, photosCount] = await Promise.all([
                db.syncQueue.count(),
                offlinePhotoService.getPendingCount(),
            ])
            pendingOperationsCount.value = operationsCount
            pendingPhotosCount.value = photosCount
        } catch (error) {
            logger.error('获取待同步数量失败', LOG_CONTEXT, error)
        }
    }

    /**
     * 添加操作到同步队列
     */
    async function addToSyncQueue(
        operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>
    ): Promise<number> {
        const id = await db.syncQueue.add({
            ...operation,
            createdAt: Date.now(),
            retryCount: 0,
            priority: operation.priority ?? 10,
        })
        await updatePendingCount()

        // 如果在线且未开启离线模式，尝试立即同步
        if (isOnline.value && !offlineModeEnabled.value) {
            syncPendingOperations()
        }

        return id as number
    }

    /**
     * 从同步队列移除操作
     */
    async function removeFromSyncQueue(id: number): Promise<void> {
        await db.syncQueue.delete(id)
        await updatePendingCount()
    }

    // ===== 同步操作 =====

    /**
     * 同步所有待处理的操作（包括图片上传）
     */
    async function syncPendingOperations(): Promise<boolean> {
        if (isSyncing.value || !isOnline.value) {
            return false
        }

        isSyncing.value = true
        syncError.value = null
        syncProgress.value = 0

        try {
            // 第一步：上传待处理的图片
            const photoResult = await offlinePhotoService.uploadPendingPhotos()
            logger.info(`图片上传完成: ${photoResult.success}/${photoResult.total} 成功`, LOG_CONTEXT)

            // 第二步：按优先级和创建时间排序获取操作
            const operations = await db.syncQueue
                .orderBy('priority')
                .toArray()

            const totalItems = operations.length + photoResult.total
            let completedItems = photoResult.success + photoResult.failed

            if (operations.length === 0 && photoResult.total === 0) {
                return true
            }

            let successCount = photoResult.success

            for (const op of operations) {
                try {
                    await processOperation(op)
                    await db.syncQueue.delete(op.id!)
                    successCount++
                    completedItems++
                    syncProgress.value = Math.round((completedItems / totalItems) * 100)
                } catch (error) {
                    // 更新重试次数和错误信息
                    const retryCount = op.retryCount + 1
                    const lastError = error instanceof Error ? error.message : '同步失败'

                    await db.syncQueue.update(op.id!, {
                        retryCount,
                        lastError,
                    })

                    completedItems++

                    // 超过最大重试次数（3次），记录错误但继续处理其他操作
                    if (retryCount >= 3) {
                        logger.error('操作重试 3 次后失败', LOG_CONTEXT, { op, error })
                    }
                }
            }

            lastSyncTime.value = Date.now()
            await updatePendingCount()

            const totalSuccess = successCount
            const totalFailed = totalItems - totalSuccess
            logger.info(`同步完成: ${totalSuccess} 成功, ${totalFailed} 失败`, LOG_CONTEXT)

            return totalFailed === 0
        } catch (error) {
            syncError.value = error instanceof Error ? error.message : '同步失败'
            logger.error('同步失败', LOG_CONTEXT, error)
            return false
        } finally {
            isSyncing.value = false
            syncProgress.value = 0
        }
    }

    /**
     * 处理单个同步操作
     */
    async function processOperation(op: SyncOperation): Promise<void> {
        switch (op.entityType) {
            case 'memory':
                await processMemoryOperation(op)
                break
            case 'photo':
                await processPhotoOperation(op)
                break
            default:
                throw new Error(`Unknown entity type: ${op.entityType}`)
        }
    }

    /**
     * 处理记忆相关的同步操作
     */
    async function processMemoryOperation(op: SyncOperation): Promise<void> {
        switch (op.type) {
            case 'create': {
                const createData = op.data as {
                    date: string
                    content?: string
                    mood?: string
                    photoKeys?: string[]
                    tags?: string[]
                    localPhotos?: unknown
                }
                const localMemory = await db.memories.get(createData.date)
                const mergedPhotoKeys = [
                    ...new Set([
                        ...(createData.photoKeys || []),
                        ...((localMemory?.photos || [])
                            .map((p) => p.key)
                            .filter((key): key is string => typeof key === 'string' && key.length > 0)),
                    ])
                ]

                const { localPhotos: _localPhotos, ...restData } = createData
                const payload = {
                    ...restData,
                    ...(mergedPhotoKeys.length > 0 ? { photoKeys: mergedPhotoKeys } : {}),
                }

                const serverMemory = await api.memories.create(payload)
                // 更新本地缓存，替换临时 ID
                if (localMemory) {
                    await db.memories.put({
                        ...localMemory,
                        ...serverMemory,
                        _syncStatus: 'synced' as SyncStatus,
                        _localUpdatedAt: Date.now(),
                        _isTemp: false,
                    })
                }
                break
            }

            case 'update': {
                await api.memories.update(op.entityId, op.data)
                // 更新本地缓存状态
                const localMemory = await db.memories.get(op.entityId)
                if (localMemory) {
                    await db.memories.put({
                        ...localMemory,
                        _syncStatus: 'synced' as SyncStatus,
                        _localUpdatedAt: Date.now(),
                    })
                }
                break
            }

            case 'delete': {
                await api.memories.delete(op.entityId)
                // 本地已经删除，无需额外操作
                break
            }
        }
    }

    /**
     * 处理照片相关的同步操作
     */
    async function processPhotoOperation(op: SyncOperation): Promise<void> {
        // 照片上传由 offlinePhotoService.uploadPendingPhotos() 统一处理
        // 这里只处理照片删除等其他操作
        if (op.type === 'delete') {
            // 如果是删除操作，从待上传队列中移除
            await offlinePhotoService.deletePendingPhoto(op.entityId)
            logger.info(`删除待上传照片: ${op.entityId}`, LOG_CONTEXT)
        } else {
            logger.debug(`照片操作已由 offlinePhotoService 处理: ${op.type}`, LOG_CONTEXT)
        }
    }

    // ===== 本地数据管理 - 记忆 =====

    /**
     * 获取本地记忆
     */
    async function getLocalMemory(date: string): Promise<LocalMemory | null> {
        try {
            const memory = await db.memories.get(date)
            return memory || null
        } catch (error) {
            logger.error(`获取本地记忆失败: ${date}`, LOG_CONTEXT, error)
            return null
        }
    }

    /**
     * 保存记忆到本地
     */
    async function saveLocalMemory(memory: LocalMemory): Promise<void> {
        try {
            await db.memories.put(memory)
        } catch (error) {
            logger.error('保存本地记忆失败', LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 删除本地记忆
     */
    async function deleteLocalMemory(date: string): Promise<void> {
        try {
            await db.memories.delete(date)
        } catch (error) {
            logger.error(`删除本地记忆失败: ${date}`, LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 批量保存记忆
     */
    async function bulkSaveMemories(memories: LocalMemory[]): Promise<void> {
        try {
            await db.memories.bulkPut(memories)
        } catch (error) {
            logger.error('批量保存记忆失败', LOG_CONTEXT, error)
            throw error
        }
    }

    // ===== 本地数据管理 - 日历 =====

    /**
     * 获取本地日历数据
     */
    async function getLocalCalendarDays(year: number, month: number): Promise<LocalCalendarDay[]> {
        try {
            const prefix = `${year}-${String(month).padStart(2, '0')}`
            return await db.calendarDays
                .where('date')
                .startsWith(prefix)
                .toArray()
        } catch (error) {
            logger.error(`获取本地日历数据失败: ${year}-${month}`, LOG_CONTEXT, error)
            return []
        }
    }

    /**
     * 保存日历数据到本地
     */
    async function saveLocalCalendarDays(days: LocalCalendarDay[]): Promise<void> {
        try {
            await db.calendarDays.bulkPut(days)
        } catch (error) {
            logger.error('保存本地日历数据失败', LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 更新单个日历日数据
     */
    async function updateLocalCalendarDay(day: LocalCalendarDay): Promise<void> {
        try {
            await db.calendarDays.put(day)
        } catch (error) {
            logger.error(`更新本地日历日数据失败: ${day.date}`, LOG_CONTEXT, error)
            throw error
        }
    }

    // ===== 缓存管理 =====

    /**
     * 获取缓存大小（格式化后）
     */
    async function getCacheSizeFormatted(): Promise<string> {
        const { usage } = await getStorageEstimate()
        return formatStorageSize(usage)
    }

    /**
     * 获取缓存详情
     */
    async function getCacheStats(): Promise<{
        memoriesCount: number
        calendarDaysCount: number
        pendingCount: number
        storageUsage: string
    }> {
        const [memoriesCount, calendarDaysCount, pendingCount, { usage }] = await Promise.all([
            db.memories.count(),
            db.calendarDays.count(),
            db.syncQueue.count(),
            getStorageEstimate(),
        ])

        return {
            memoriesCount,
            calendarDaysCount,
            pendingCount,
            storageUsage: formatStorageSize(usage),
        }
    }

    /**
     * 清除已同步的缓存数据
     * 保留待同步的数据
     */
    async function clearSyncedCache(): Promise<void> {
        try {
            // 只删除已同步的记忆
            await db.memories
                .where('_syncStatus')
                .equals('synced')
                .delete()

            // 清除所有日历缓存
            await db.calendarDays.clear()

            logger.info('已同步缓存已清除', LOG_CONTEXT)
        } catch (error) {
            logger.error('清除缓存失败', LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 清除所有缓存（危险操作）
     * 会丢失未同步的数据
     */
    async function clearAllCache(): Promise<void> {
        try {
            await db.memories.clear()
            await db.calendarDays.clear()
            await db.syncQueue.clear()
            await updatePendingCount()

            logger.warn('所有缓存已清除', LOG_CONTEXT)
        } catch (error) {
            logger.error('清除所有缓存失败', LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 清除同步队列
     */
    async function clearSyncQueue(): Promise<void> {
        try {
            await db.syncQueue.clear()
            await updatePendingCount()
        } catch (error) {
            logger.error('清除同步队列失败', LOG_CONTEXT, error)
            throw error
        }
    }

    /**
     * 清理过期缓存（LRU 策略）
     */
    async function cleanupExpiredCache(maxMemories: number = 500): Promise<void> {
        try {
            const count = await db.memories.count()

            if (count <= maxMemories) {
                return
            }

            // 按本地更新时间排序，删除最旧的已同步记忆
            const toDelete = await db.memories
                .where('_syncStatus')
                .equals('synced')
                .sortBy('_localUpdatedAt')

            const deleteCount = Math.min(toDelete.length, count - maxMemories)
            const deleteIds = toDelete.slice(0, deleteCount).map(m => m.date)

            await db.memories.bulkDelete(deleteIds)

            logger.info(`清理了 ${deleteCount} 条旧记忆`, LOG_CONTEXT)
        } catch (error) {
            logger.error('清理缓存失败', LOG_CONTEXT, error)
        }
    }

    // ===== 导出 =====

    return {
        // 状态
        isOnline,
        isOfflineMode,
        isSyncing,
        syncProgress,
        lastSyncTime,
        pendingOperationsCount,
        pendingPhotosCount,
        totalPendingCount,
        hasPendingSync,
        syncStatus,
        syncError,
        offlineModeEnabled,
        isInitialized,

        // 初始化
        init,

        // 同步队列
        addToSyncQueue,
        removeFromSyncQueue,
        syncPendingOperations,

        // 记忆管理
        getLocalMemory,
        saveLocalMemory,
        deleteLocalMemory,
        bulkSaveMemories,

        // 日历管理
        getLocalCalendarDays,
        saveLocalCalendarDays,
        updateLocalCalendarDay,

        // 缓存管理
        getCacheSizeFormatted,
        getCacheStats,
        clearSyncedCache,
        clearAllCache,
        clearSyncQueue,
        cleanupExpiredCache,
    }
})
