<script setup lang="ts">
/**
 * 离线横幅组件
 * 当用户处于离线状态时在顶部显示提示
 */
import { ref, watch } from 'vue'
import { useOffline } from '@/composables/useOffline'
import { WifiOff, RefreshCw, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  dismissible?: boolean
  autoHideOnOnline?: boolean
}>(), {
  dismissible: true,
  autoHideOnOnline: true,
})

const {
  isOnline,
  isSyncing,
  totalPendingCount,
  hasPendingSync,
  triggerSync,
} = useOffline()
const { t } = useI18n()

const isDismissed = ref(false)

// 恢复在线时可选择自动隐藏
watch(isOnline, (online) => {
  if (online && props.autoHideOnOnline) {
    // 延迟隐藏，让用户看到状态变化
    setTimeout(() => {
      if (isOnline.value) {
        isDismissed.value = true
      }
    }, 2000)
  } else if (!online) {
    // 离线时重新显示
    isDismissed.value = false
  }
})

const handleDismiss = () => {
  isDismissed.value = true
}

const handleSync = async () => {
  if (isOnline.value && !isSyncing.value) {
    await triggerSync()
  }
}
</script>

<template>
  <Transition name="slide-down">
    <div 
      v-if="!isOnline && !isDismissed"
      class="offline-banner"
    >
      <div class="banner-content">
        <WifiOff class="w-4 h-4 flex-shrink-0" />
        <span class="banner-text">{{ t('offline_banner.offline_mode') }}</span>
        
        <!-- 待同步数量 -->
        <span v-if="totalPendingCount > 0" class="pending-badge">
          {{ t('offline_banner.pending_sync', { count: totalPendingCount }) }}
        </span>
      </div>
      
      <!-- 关闭按钮 -->
      <button
        v-if="dismissible"
        @click="handleDismiss"
        class="dismiss-btn"
        :aria-label="t('offline_banner.close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </Transition>
  
  <!-- 恢复在线后的同步提示 -->
  <Transition name="slide-down">
    <div 
      v-if="isOnline && hasPendingSync && !isDismissed"
      class="sync-banner"
    >
      <div class="banner-content">
        <RefreshCw 
          class="w-4 h-4 flex-shrink-0" 
          :class="{ 'animate-spin': isSyncing }" 
        />
        <span class="banner-text">
          {{ isSyncing ? t('offline_banner.syncing') : t('offline_banner.pending_records', { count: totalPendingCount }) }}
        </span>
        
        <!-- 同步按钮 -->
        <button
          v-if="!isSyncing"
          @click="handleSync"
          class="sync-btn"
        >
          {{ t('offline_banner.sync_now') }}
        </button>
      </div>
      
      <!-- 关闭按钮 -->
      <button
        v-if="dismissible && !isSyncing"
        @click="handleDismiss"
        class="dismiss-btn"
        :aria-label="t('offline_banner.close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner,
.sync-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.offline-banner {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

.sync-banner {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.banner-text {
  flex-shrink: 0;
}

.pending-badge {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 12px;
}

.sync-btn {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sync-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.dismiss-btn {
  padding: 4px;
  margin-left: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  opacity: 0.8;
  transition: all 0.2s;
  cursor: pointer;
}

.dismiss-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* 适配安全区域 */
@supports (padding-top: env(safe-area-inset-top)) {
  .offline-banner,
  .sync-banner {
    padding-top: calc(12px + env(safe-area-inset-top));
  }
}
</style>
