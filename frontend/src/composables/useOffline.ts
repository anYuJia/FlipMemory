/**
 * 离线功能的组合式函数
 * 提供响应式的离线状态和便捷操作
 */
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useOfflineStore } from '@/stores/offline'

export function useOffline() {
    const offlineStore = useOfflineStore()

    // 从 store 提取响应式引用
    const {
        isOnline,
        isOfflineMode,
        isSyncing,
        syncProgress,
        pendingOperationsCount,
        pendingPhotosCount,
        totalPendingCount,
        syncStatus,
        syncError,
        lastSyncTime,
        hasPendingSync,
        offlineModeEnabled,
    } = storeToRefs(offlineStore)

    // 缓存统计信息
    const cacheStats = ref<{
        memoriesCount: number
        calendarDaysCount: number
        pendingCount: number
        storageUsage: string
    } | null>(null)

    // ===== 计算属性 =====

    /**
     * 格式化的上次同步时间
     */
    const lastSyncTimeFormatted = computed(() => {
        if (!lastSyncTime.value) return '从未同步'

        const diff = Date.now() - lastSyncTime.value
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (seconds < 60) return '刚刚'
        if (minutes < 60) return `${minutes} 分钟前`
        if (hours < 24) return `${hours} 小时前`
        if (days < 7) return `${days} 天前`

        // 超过 7 天显示具体日期
        const date = new Date(lastSyncTime.value)
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    })

    /**
     * 同步状态文本
     */
    const syncStatusText = computed(() => {
        switch (syncStatus.value) {
            case 'syncing':
                return syncProgress.value > 0
                    ? `同步中... ${syncProgress.value}%`
                    : '同步中...'
            case 'offline':
                return '离线模式'
            case 'pending': {
                const ops = pendingOperationsCount.value
                const photos = pendingPhotosCount.value
                if (ops > 0 && photos > 0) {
                    return `${ops} 条记忆 + ${photos} 张图片待同步`
                } else if (photos > 0) {
                    return `${photos} 张图片待上传`
                }
                return `${ops} 条待同步`
            }
            case 'synced':
                return '已同步'
            case 'error':
                return '同步失败'
            default:
                return ''
        }
    })

    /**
     * 同步状态颜色 class
     */
    const syncStatusColor = computed(() => {
        switch (syncStatus.value) {
            case 'syncing': return 'text-blue-500'
            case 'offline': return 'text-gray-500'
            case 'pending': return 'text-orange-500'
            case 'synced': return 'text-green-500'
            case 'error': return 'text-red-500'
            default: return ''
        }
    })

    /**
     * 同步状态背景颜色
     */
    const syncStatusBgColor = computed(() => {
        switch (syncStatus.value) {
            case 'syncing': return 'bg-blue-500/10'
            case 'offline': return 'bg-gray-500/10'
            case 'pending': return 'bg-orange-500/10'
            case 'synced': return 'bg-green-500/10'
            case 'error': return 'bg-red-500/10'
            default: return ''
        }
    })

    /**
     * 同步状态图标名称
     */
    const syncStatusIcon = computed(() => {
        switch (syncStatus.value) {
            case 'syncing': return 'loader'
            case 'offline': return 'wifi-off'
            case 'pending': return 'cloud'
            case 'synced': return 'check'
            case 'error': return 'alert-circle'
            default: return 'cloud'
        }
    })

    // ===== 方法 =====

    /**
     * 手动触发同步
     */
    async function triggerSync(): Promise<boolean> {
        if (!isOnline.value) {
            console.warn('[useOffline] Cannot sync while offline')
            return false
        }
        return await offlineStore.syncPendingOperations()
    }

    /**
     * 刷新缓存统计信息
     */
    async function refreshCacheStats(): Promise<void> {
        cacheStats.value = await offlineStore.getCacheStats()
    }

    /**
     * 清除已同步的缓存
     */
    async function clearSyncedCache(): Promise<void> {
        await offlineStore.clearSyncedCache()
        await refreshCacheStats()
    }

    /**
     * 清除所有缓存
     */
    async function clearAllCache(): Promise<void> {
        await offlineStore.clearAllCache()
        await refreshCacheStats()
    }

    /**
     * 切换离线模式
     */
    function toggleOfflineMode(): void {
        offlineModeEnabled.value = !offlineModeEnabled.value
    }

    /**
     * 设置离线模式
     */
    function setOfflineMode(enabled: boolean): void {
        offlineModeEnabled.value = enabled
    }

    // ===== 生命周期 =====

    // 组件挂载时初始化
    onMounted(async () => {
        await offlineStore.init()
        await refreshCacheStats()
    })

    return {
        // 状态
        isOnline,
        isOfflineMode,
        isSyncing,
        syncProgress,
        pendingOperationsCount,
        pendingPhotosCount,
        totalPendingCount,
        hasPendingSync,
        syncStatus,
        syncError,
        lastSyncTime,
        offlineModeEnabled,
        cacheStats,

        // 计算属性
        lastSyncTimeFormatted,
        syncStatusText,
        syncStatusColor,
        syncStatusBgColor,
        syncStatusIcon,

        // 方法
        triggerSync,
        refreshCacheStats,
        clearSyncedCache,
        clearAllCache,
        toggleOfflineMode,
        setOfflineMode,
    }
}
