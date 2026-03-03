<script setup lang="ts">
import { ref, onMounted, onActivated, onDeactivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { useOffline } from '@/composables/useOffline'
import { confirmLogout } from '@/composables/useConfirm'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import FeedbackDialog from '@/components/FeedbackDialog.vue'
import {
  Bell, Lock, Globe,
  ChevronRight, Moon, Sun, Smartphone, LogOut,
  Cloud, HardDrive, RefreshCw, Trash2, MessageSquare, Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const {
  totalPendingCount,
  syncStatusText,
  cacheStats,
  refreshCacheStats,
  clearSyncedCache,
} = useOffline()

const isLoaded = ref(false)
const hasAnimated = ref(false)
const scrollY = ref(0)
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

const toggleReminder = () => userStore.toggleReminder()
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

const handleLanguageChange = (lang: string) => {
  userStore.setLocale(lang)
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
    setTimeout(() => { hasAnimated.value = true }, 600)
  }, 100)
})

onActivated(() => { if (scrollY.value > 0) window.scrollTo(0, scrollY.value) })
onDeactivated(() => { scrollY.value = window.scrollY })
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景光晕 - 压制暗色 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.04]" style="background-color: var(--glow-primary);" />
      <div class="absolute top-1/4 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.08] dark:opacity-[0.03]" style="background-color: var(--glow-secondary);" />
    </div>
    
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">Preferences</span>
            <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('nav.settings') }}</h1>
        </div>
      </header>
      
      <!-- 个人资料卡片 - 增强防御 -->
      <section class="mb-10 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <button @click="router.push({ name: 'settings-profile' })" class="w-full relative overflow-hidden p-6 rounded-[2.5rem] card-static shadow-xl transition-all duration-500 hover:scale-[1.02] active:scale-95 group">
          <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-400 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <div class="relative flex items-center gap-5">
            <div class="relative">
              <div class="w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl overflow-hidden shadow-2xl border-4 border-white/50 dark:border-white/5" style="background: var(--gradient-accent);">
                <!-- 关键修复：增加完整的可选链保护 -->
                <img v-if="userStore.profile?.avatarUrl" :src="userStore.profile.avatarUrl" class="w-full h-full object-cover" />
                <span v-else class="drop-shadow-lg">👤</span>
              </div>
              <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-black/5 flex items-center justify-center shadow-sm">
                <Sparkles class="w-3.5 h-3.5 text-orange-400" />
              </div>
            </div>
            <div class="flex-1 text-left">
              <h3 class="text-xl font-black tracking-tight" style="color: var(--text-primary);">{{ userStore.displayName }}</h3>
              <p class="text-[10px] font-black tracking-widest uppercase opacity-30 mt-1" style="color: var(--text-primary);">Premium Member</p>
            </div>
          </div>
        </button>
      </section>
      
      <!-- 显示与语言 -->
      <section class="mb-8">
        <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 px-2 mb-3 block" style="color: var(--text-primary);">Appearance & Language</span>
        <div class="rounded-[2.5rem] overflow-hidden card-static shadow-sm">
          <button @click="router.push({ name: 'settings-theme' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 shadow-sm">
              <component :is="themeIcon[userStore.settings.theme] || Sun" class="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ t('settings.theme_title') }}</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold opacity-30" style="color: var(--text-primary);">{{ themeLabel[userStore.settings.theme] }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
            </div>
          </button>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <div class="px-6 py-5">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 shadow-sm">
                <Globe class="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">{{ t('settings.language_title') }}</div>
              <span class="text-xs font-bold opacity-30" style="color: var(--text-primary);">{{ currentLanguageLabel }}</span>
            </div>
            <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button v-for="lang in languages" :key="lang.key" @click="handleLanguageChange(lang.key)"
                class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border"
                :class="locale === lang.key ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-lg' : 'bg-black/5 dark:bg-white/5 border-transparent opacity-40'">
                {{ lang.label }}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 退出 -->
      <section class="mb-12 pb-32">
        <div class="rounded-[2.5rem] overflow-hidden card-static shadow-sm">
          <button @click="handleLogout" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-500/10 shadow-sm group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors">
              <LogOut class="w-5 h-5 text-red-500" />
            </div>
            <div class="flex-1 text-left text-sm font-black tracking-tight text-red-500/80 group-hover:text-red-500 transition-colors">{{ t('settings.logout') }}</div>
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
