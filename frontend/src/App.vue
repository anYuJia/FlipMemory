<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNav from './components/layout/AppNav.vue'
import ToastNotification from './components/ui/ToastNotification.vue'
import OfflineBanner from './components/OfflineBanner.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import ErrorToast from './components/ErrorToast.vue'
import GlobalConfirmDialog from './components/GlobalConfirmDialog.vue'
import GlobalConflictDialog from './components/GlobalConflictDialog.vue'
import { useUserStore, useOfflineStore } from './stores'
import { useTimeTheme } from './composables/useTimeTheme'
import { offlinePhotoService } from './services/offlinePhotoService'

const userStore = useUserStore()
const offlineStore = useOfflineStore()
const route = useRoute()
useTimeTheme()

// 判断是否是授权页面，隐藏导航栏
const isAuthPage = computed(() => route.name === 'auth')

// Tab 页面顺序索引，用于判断滑动方向
const tabOrder = ['home', 'calendar', 'flashback', 'stats', 'settings'] as const
const transitionName = ref('slide-left')

watch(() => route.name, (newName, oldName) => {
  const newIdx = tabOrder.indexOf(newName as typeof tabOrder[number])
  const oldIdx = tabOrder.indexOf(oldName as typeof tabOrder[number])
  // 仅在两个都是 tab 页面时应用滑动方向
  if (newIdx >= 0 && oldIdx >= 0) {
    transitionName.value = newIdx > oldIdx ? 'slide-left' : 'slide-right'
  } else {
    transitionName.value = 'fade'
  }
})

onMounted(() => {
  userStore.init()
  // 离线初始化包含网络同步，不阻塞首屏渲染
  offlineStore.init().catch(() => {})
})

onBeforeUnmount(() => {
  offlinePhotoService.revokeAllUrls()
})
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-app overflow-hidden relative">
      <!-- 全站统一动态光晕底层 -->
      <div class="fixed inset-0 pointer-events-none z-0">
        <div
          class="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-[2000ms] ease-in-out"
          :style="{ backgroundColor: 'var(--color-primary)', opacity: '0.12' }"
        />
        <div
          class="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-[2000ms] ease-in-out"
          :style="{ backgroundColor: 'var(--color-accent)', opacity: '0.08' }"
        />
      </div>

      <div class="relative z-10 min-h-screen flex flex-col">
        <OfflineBanner />

        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <KeepAlive :include="['HomeView', 'CalendarView', 'StatsView', 'SearchView', 'FlashbackView', 'SettingsView']">
              <component :is="Component" :key="route.name" />
            </KeepAlive>
          </Transition>
        </RouterView>

        <AppNav v-if="!isAuthPage" />
      </div>

      <!-- 全局组件 -->
      <ToastNotification />
      <ErrorToast />
      <GlobalConfirmDialog />
      <GlobalConflictDialog />
    </div>
  </ErrorBoundary>
</template>

<style>
.bg-app {
  background-color: var(--bg-primary);
}

.page-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
  background-color: transparent !important;
}

/* Tab 页面左右滑动过渡 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(60px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-60px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-60px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(60px);
}

/* 非 Tab 页面淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
