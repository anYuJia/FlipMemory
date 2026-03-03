<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { useOffline } from '@/composables/useOffline'
import { confirmLogout } from '@/composables/useConfirm'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import FeedbackDialog from '@/components/FeedbackDialog.vue'
import {
  Bell, Lock, Globe, ChevronRight, Moon, Sun, Smartphone, LogOut,
  Cloud, HardDrive, RefreshCw, Trash2, MessageSquare, Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const { totalPendingCount, syncStatusText, cacheStats, refreshCacheStats, clearSyncedCache } = useOffline()

const isLoaded = ref(false)
const isClearingCache = ref(false)
const showFeedbackDialog = ref(false)

const themeIcon = { light: Sun, dark: Moon, system: Smartphone }
const themeLabel = computed(() => ({
  light: t('settings.theme.light'),
  dark: t('settings.theme.dark'),
  system: t('settings.theme.system')
}))

const languages = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' }
]

const currentLanguageLabel = computed(() => {
  return languages.find(l => l.key === locale.value)?.label || 'English'
})

const handleLogout = async () => {
  if (await confirmLogout()) {
    userStore.logout()
    router.push({ name: 'auth' })
  }
}

const handleClearCache = async () => {
  if (isClearingCache.value) return
  isClearingCache.value = true
  try {
    await clearSyncedCache()
    await refreshCacheStats()
  } finally {
    isClearingCache.value = false
  }
}

const cycleLanguage = () => {
  console.log('SettingsView: cycleLanguage called')
  const currentIndex = languages.findIndex(l => l.key === locale.value)
  const nextIndex = (currentIndex + 1) % languages.length
  const nextLang = languages[nextIndex].key
  if (typeof userStore.setLocale === 'function') {
    userStore.setLocale(nextLang)
  } else {
    console.error('userStore.setLocale is not a function!')
    // 兜底逻辑
    localStorage.setItem('locale', nextLang)
    window.location.reload()
  }
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container relative">
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">Preferences</span>
            <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('nav.settings') }}</h1>
        </div>
      </header>
      
      <!-- 用户名片 -->
      <section class="mb-8 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <button @click="router.push({ name: 'settings-profile' })" class="w-full relative overflow-hidden p-6 rounded-[2.5rem] card-static shadow-xl transition-all duration-500 hover:scale-[1.01] active:scale-95 group">
          <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-400 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <div class="relative flex items-center gap-5">
            <div class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl overflow-hidden shadow-xl border-2 border-white/50 dark:border-white/10" style="background: var(--gradient-accent);">
              <img v-if="userStore.profile?.avatarUrl" :src="userStore.profile.avatarUrl" class="w-full h-full object-cover" />
              <span v-else class="drop-shadow-md">👤</span>
            </div>
            <div class="flex-1 text-left">
              <h3 class="text-lg font-black tracking-tight" style="color: var(--text-primary);">{{ userStore.displayName }}</h3>
              <p class="text-[9px] font-black tracking-widest uppercase opacity-30 mt-0.5" style="color: var(--text-primary);">Premium Member</p>
            </div>
            <ChevronRight class="w-5 h-5 opacity-20" style="color: var(--text-primary);" />
          </div>
        </button>
      </section>
      
      <!-- 外观与语言分组 -->
      <section class="mb-6 transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2rem] overflow-hidden card-static shadow-sm">
          <!-- 主题 -->
          <button @click="router.push({ name: 'settings-theme' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 shadow-sm">
              <component :is="themeIcon[userStore.settings.theme] || Sun" class="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ $t('settings.theme_title') }}</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold opacity-30" style="color: var(--text-primary);">{{ themeLabel[userStore.settings.theme] }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
            </div>
          </button>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <!-- 语言 -->
          <button @click="router.push({ name: 'settings-language' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 shadow-sm">
              <Globe class="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ $t('settings.language_title') }}</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold opacity-30" style="color: var(--text-primary);">{{ currentLanguageLabel }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
            </div>
          </button>
        </div>
      </section>
      
      <!-- 安全与数据 -->
      <section class="mb-6 transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2rem] overflow-hidden card-static shadow-sm">
          <div class="flex items-center gap-4 px-6 py-5">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 shadow-sm">
              <Bell class="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ $t('settings.daily_reminder') }}</div>
            <div class="w-12 h-7 rounded-full bg-black/5 dark:bg-white/10" /> <!-- 简化展示 -->
          </div>
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          <div class="flex items-center gap-4 px-6 py-5">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 shadow-sm">
              <Cloud class="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ totalPendingCount > 0 ? syncStatusText : 'Synced' }}</div>
            <SyncStatusIndicator :show-text="false" size="md" />
          </div>
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          <button @click="handleClearCache" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-500/10 shadow-sm">
              <HardDrive class="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ $t('settings.local_cache') }}</div>
            <Trash2 class="w-4 h-4 text-red-400 opacity-40" />
          </button>
        </div>
      </section>
      
      <!-- 反馈与退出与反馈分组 -->
      <section class="mb-12 pb-32 transition-all duration-700 delay-400" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2.5rem] overflow-hidden card-static shadow-sm">
          <button @click="router.push({ name: 'settings-feedback' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-500/10 shadow-sm">
              <MessageSquare class="w-5 h-5 text-gray-400 dark:text-gray-300" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">反馈与建议</div>
            <ChevronRight class="w-4 h-4 opacity-20" />
          </button>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          <button @click="handleLogout" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-500/10 shadow-sm group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors">
              <LogOut class="w-5 h-5 text-red-500" />
            </div>
            <div class="flex-1 text-left text-sm font-black tracking-tight text-red-500/80 group-hover:text-red-500 transition-colors">{{ $t('settings.logout') }}</div>
          </button>
        </div>
      </section>
    </div>
    <FeedbackDialog v-model:visible="showFeedbackDialog" />
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
