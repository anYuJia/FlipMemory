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

// 判断是否显示底部导航（登录页不显示）
const showNav = computed(() => {
  return route.name !== 'auth'
})

// 监听主题变化并应用到 HTML 元素
const applyTheme = () => {
  const theme = userStore.settings.theme
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', isDark)
}

watch(() => userStore.settings.theme, applyTheme)

onMounted(async () => {
  applyTheme()

  // 初始化离线 Store
  await offlineStore.init()

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (userStore.settings.theme === 'system') {
      applyTheme()
    }
  })
})
</script>

<template>
  <ErrorBoundary>
    <div class="min-h-screen">
      <!-- 离线状态横幅 -->
      <OfflineBanner />

      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <KeepAlive :include="['HomeView', 'CalendarView', 'StatsView', 'SearchView', 'FlashbackView', 'SettingsView']">
            <component :is="Component" />
          </KeepAlive>
        </Transition>
      </RouterView>

      <AppNav v-if="showNav" />
      <ToastNotification />
      <ErrorToast />
      <GlobalConfirmDialog />
      <GlobalConflictDialog />
    </div>
  </ErrorBoundary>
</template>

<style>
/* 页面切换动画 - 顶级丝滑感 */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
  filter: blur(10px);
}

.page-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
  filter: blur(10px);
}

/* 确保切换时背景不闪烁 */
.page-container {
  min-height: 100vh;
  width: 100%;
}
</style>
