<script setup lang="ts">
/**
 * 同步状态指示器组件
 * 显示当前的同步状态，支持点击触发同步
 */
import { useOffline } from '@/composables/useOffline'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  showText: true,
  size: 'md',
})

const {
  isOnline,
  isSyncing,
  syncStatus,
  syncStatusText,
  totalPendingCount,
  triggerSync,
} = useOffline()

const handleClick = async () => {
  if (isOnline.value && !isSyncing.value) {
    await triggerSync()
  }
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}
</script>

<template>
  <button
    @click="handleClick"
    class="sync-indicator inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200"
    :class="[
      sizeClasses[size],
      {
        'cursor-pointer hover:scale-105 active:scale-95': isOnline && !isSyncing && totalPendingCount > 0,
        'cursor-default': !isOnline || isSyncing || totalPendingCount === 0,
      }
    ]"
    :style="{
      background: syncStatus === 'syncing' ? 'rgba(59, 130, 246, 0.12)' :
                  syncStatus === 'offline' ? 'rgba(107, 114, 128, 0.12)' :
                  syncStatus === 'pending' ? 'rgba(249, 115, 22, 0.12)' :
                  syncStatus === 'error' ? 'rgba(239, 68, 68, 0.12)' :
                  'rgba(34, 197, 94, 0.12)',
      color: syncStatus === 'syncing' ? '#3b82f6' :
             syncStatus === 'offline' ? '#6b7280' :
             syncStatus === 'pending' ? '#f97316' :
             syncStatus === 'error' ? '#ef4444' :
             '#22c55e',
    }"
    :disabled="!isOnline || isSyncing || totalPendingCount === 0"
  >
    <!-- 离线状态 -->
    <CloudOff 
      v-if="syncStatus === 'offline'" 
      :class="iconSizeClasses[size]" 
    />
    
    <!-- 同步中 -->
    <RefreshCw 
      v-else-if="syncStatus === 'syncing'" 
      :class="[iconSizeClasses[size], 'animate-spin']" 
    />
    
    <!-- 待同步 -->
    <Cloud 
      v-else-if="syncStatus === 'pending'" 
      :class="iconSizeClasses[size]" 
    />
    
    <!-- 错误状态 -->
    <AlertCircle 
      v-else-if="syncStatus === 'error'" 
      :class="iconSizeClasses[size]" 
    />
    
    <!-- 已同步 -->
    <Check 
      v-else 
      :class="iconSizeClasses[size]" 
    />
    
    <!-- 文本 -->
    <span v-if="showText">{{ syncStatusText }}</span>
  </button>
</template>

<style scoped>
.sync-indicator {
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.dark .sync-indicator {
  border-color: rgba(255, 255, 255, 0.05);
}
</style>
