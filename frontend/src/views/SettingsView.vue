<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { useOffline } from '@/composables/useOffline'
import { confirmLogout } from '@/composables/useConfirm'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import {
  Globe, ChevronRight, Moon, Sun, Smartphone, LogOut,
  MessageSquare, Shield, Database
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const { refreshCacheStats } = useOffline()

const isLoaded = ref(true)

const themeIcon = { light: Sun, dark: Moon, system: Smartphone }

// 核心修复：确保主题标签通过正确的路径动态翻译
const currentThemeLabel = computed(() => {
  const theme = userStore.settings.theme || 'system'
  return t(`settings.theme.${theme}`)
})

const languages = ['zh-CN', 'zh-TW', 'ja', 'en']

const currentLanguageLabel = computed(() => {
  const current = languages.find(key => key === locale.value) || 'en'
  return t(`language.${current}`)
})

const handleLogout = async () => {
  if (await confirmLogout()) {
    userStore.logout()
    router.push({ name: 'auth' })
  }
}

onMounted(() => {
  refreshCacheStats()
})
</script>

<template>
  <div class="page-container relative">
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('nav.settings') }}</span>
            <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60 shadow-[0_0_8px_var(--color-primary)]"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('nav.settings') }}</h1>
        </div>
      </header>
      
      <!-- 个人资料卡片 -->
      <section class="mb-8 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <button @click="router.push({ name: 'settings-profile' })" class="w-full relative overflow-hidden p-6 rounded-[2.5rem] card-static shadow-xl transition-all duration-500 hover:scale-[1.01] active:scale-95 group">
          <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-400 rounded-full blur-[60px] opacity-[0.05] group-hover:opacity-10 transition-opacity"></div>
          <div class="relative flex items-center gap-5">
            <div class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl overflow-hidden shadow-xl border-2 border-white/50 dark:border-white/10" style="background: var(--gradient-accent);">
              <img v-if="userStore.profile?.avatar" :src="userStore.profile.avatar" class="w-full h-full object-cover" />
              <span v-else class="drop-shadow-md">👤</span>
            </div>
            <div class="flex-1 text-left">
              <h3 class="text-lg font-black tracking-tight" style="color: var(--text-primary);">{{ userStore.displayName }}</h3>
              <p class="text-[9px] font-black tracking-widest uppercase opacity-30 mt-0.5" style="color: var(--text-primary);">{{ t('settings.profile_desc') }}</p>
            </div>
            <ChevronRight class="w-5 h-5 opacity-20" style="color: var(--text-primary);" />
          </div>
        </button>
      </section>
      
      <!-- 基础设置 -->
      <section class="mb-6 transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm">
          <!-- 主题按钮 -->
          <button @click="router.push({ name: 'settings-theme' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10">
              <component :is="themeIcon[userStore.settings.theme] || Sun" class="w-5 h-5 text-purple-500" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.theme_title') }}</div>
              <div class="text-[9px] font-bold opacity-30 uppercase">{{ t('settings.theme_desc') }}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black opacity-30" style="color: var(--text-primary);">{{ currentThemeLabel }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
            </div>
          </button>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <!-- 语言按钮 -->
          <button @click="router.push({ name: 'settings-language' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10">
              <Globe class="w-5 h-5 text-blue-500" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.language_title') }}</div>
              <div class="text-[9px] font-bold opacity-30 uppercase">{{ t('settings.language_desc').substring(0, 12) }}...</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black opacity-30" style="color: var(--text-primary);">{{ currentLanguageLabel }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
            </div>
          </button>
        </div>
      </section>
      
      <!-- 安全与数据 -->
      <section class="mb-6 transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm">
          <button @click="router.push({ name: 'settings-privacy' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-green-500/10">
              <Shield class="w-5 h-5 text-green-500" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.privacy_title') }}</div>
              <div class="text-[9px] font-bold opacity-30 uppercase">{{ t('settings.privacy_desc') }}</div>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
          </button>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <button @click="router.push({ name: 'settings-data' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-500/10">
              <Database class="w-5 h-5 text-orange-500" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.data_title') }}</div>
              <div class="text-[9px] font-bold opacity-30 uppercase">{{ t('settings.data_desc') }}</div>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
          </button>
        </div>
      </section>
      
      <!-- 辅助与退出 -->
      <section class="mb-12 pb-32 transition-all duration-700 delay-400" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm">
          <button @click="router.push({ name: 'settings-feedback' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-500/10 shadow-sm">
              <MessageSquare class="w-5 h-5 text-slate-500" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.feedback_title') }}</div>
              <div class="text-[9px] font-bold opacity-30 uppercase">{{ t('settings.feedback_desc') }}</div>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" />
          </button>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          
          <button @click="handleLogout" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-red-500/5 transition-colors group">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-red-500/10 shadow-sm group-hover:bg-red-500/20 transition-colors">
              <LogOut class="w-5 h-5 text-red-500" />
            </div>
            <div class="flex-1 text-left text-sm font-black tracking-tight text-red-500/80 group-hover:text-red-500 transition-colors">{{ t('settings.logout') }}</div>
          </button>
        </div>
      </section>
    </div>
    <SyncStatusIndicator />
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
</style>
