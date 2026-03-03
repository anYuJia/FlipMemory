<script setup lang="ts">
import { watch, onMounted, computed } from 'vue'
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

const userStore = useUserStore()
const offlineStore = useOfflineStore()
const route = useRoute()
const { currentPhase } = useTimeTheme()

onMounted(async () => {
  userStore.init()
  await offlineStore.init()
})
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-app overflow-hidden relative">
      <!-- 全站统一动态光晕底层 -->
      <div class="fixed inset-0 pointer-events-none z-0">
        <div 
          class="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-[2000ms] ease-in-out" 
          :style="{ backgroundColor: 'var(--color-primary)', opacity: 'var(--glow-opacity, 0.12)' }" 
        />
        <div 
          class="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-[2000ms] ease-in-out" 
          :style="{ backgroundColor: 'var(--color-accent)', opacity: 'var(--glow-opacity, 0.08)' }" 
        />
      </div>

      <div class="relative z-10 min-h-screen flex flex-col">
        <OfflineBanner />

        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <KeepAlive :include="['HomeView', 'CalendarView', 'StatsView', 'SearchView', 'FlashbackView', 'SettingsView']">
              <component :is="Component" :key="route.fullPath" />
            </KeepAlive>
          </Transition>
        </RouterView>

        <AppNav />
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
  transition: background-color 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 顶级 App 切换动效 */
.page-enter-active,
.page-leave-active {
  transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.98);
  filter: blur(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(1.02);
  filter: blur(10px);
}

.page-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
  /* 确保页面容器透明，露出 App.vue 的全局光晕 */
  background-color: transparent !important;
}
</style>
