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

const userStore = useUserStore()
const offlineStore = useOfflineStore()
const route = useRoute()

const showNav = computed(() => route.name !== 'auth')

onMounted(async () => {
  userStore.init()
  await offlineStore.init()
})
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-app overflow-x-hidden">
      <OfflineBanner />

      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <KeepAlive :include="['HomeView', 'CalendarView', 'StatsView', 'SearchView', 'FlashbackView', 'SettingsView']">
            <component :is="Component" :key="route.fullPath" />
          </KeepAlive>
        </Transition>
      </RouterView>

      <AppNav />
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
  transition: background-color 0.5s ease;
}

/* 顶级 App 切换动效：iOS 风格的平滑推移 */
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

/* 确保切换时布局稳定 */
.page-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
}
</style>
