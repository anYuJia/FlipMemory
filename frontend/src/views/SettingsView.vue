<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { useOffline } from '@/composables/useOffline'
import { useConfirm } from '@/composables/useConfirm'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import {
  Globe, ChevronRight, Moon, Sun, Smartphone, LogOut,
  MessageSquare, Shield, Database, KeyRound,
  Palette, Bell, Layout
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const { refreshCacheStats } = useOffline()
const { confirm } = useConfirm()

const isLoaded = ref(false)

const themeIcon = { light: Sun, dark: Moon, system: Smartphone }

const currentThemeLabel = computed(() => {
  const theme = userStore.settings.theme || 'system'
  return t(`settings.theme.${theme}`)
})

const languages = ['zh-CN', 'zh-TW', 'ja', 'en']
const nativeNames: Record<string, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ja': '日本語',
  'en': 'English',
}
const currentLanguageLabel = computed(() => {
  return nativeNames[locale.value] || locale.value
})

const handleLogout = async () => {
  if (await confirm({ 
    title: t('settings.logout'), 
    message: t('settings.logout_confirm'),
    type: 'danger' 
  })) {
    userStore.logout()
    router.push({ name: 'auth' })
  }
}

onMounted(() => {
  refreshCacheStats()
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container page-enter pb-32">
    <!-- 动态氛围背景 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
      <div class="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] rounded-full blur-[120px]" style="background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);"></div>
    </div>

    <div class="relative max-w-lg mx-auto px-7">
      <!-- 顶部标题 -->
      <header class="pt-12 pb-6 safe-area-top">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <Layout class="w-3.5 h-3.5 opacity-30" />
            <span class="text-[9px] font-extrabold tracking-[0.2em] uppercase opacity-30">{{ t('nav.settings') }}</span>
          </div>
          <h1 class="text-3xl font-serif italic tracking-tight mt-1" style="color: var(--text-primary);">
            {{ t('settings.page_title') }}
          </h1>
        </div>
      </header>
      
      <!-- 个人资料卡片 -->
      <section class="mb-8">
        <button @click="router.push({ name: 'settings-profile' })" 
          class="w-full relative overflow-hidden p-6 rounded-[2.2rem] card-static grainy-overlay transition-all duration-700 group shadow-md"
        >
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-orange-400 rounded-full blur-[80px] opacity-[0.08] group-hover:opacity-15 transition-opacity"></div>
          
          <div class="relative flex items-center gap-5">
            <div class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl overflow-hidden shadow-xl border-2 border-white dark:border-white/10" style="background: var(--gradient-accent);">
              <img v-if="userStore.profile?.avatar" :src="userStore.profile.avatar" class="w-full h-full object-cover" />
              <span v-else class="drop-shadow-lg text-white">👤</span>
            </div>
            <div class="flex-1 text-left">
              <h3 class="text-lg font-black tracking-tight mb-0.5" style="color: var(--text-primary);">{{ userStore.displayName }}</h3>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[7px] font-black uppercase tracking-widest opacity-40">{{ t('settings.pro_member') }}</span>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 opacity-20" />
          </div>
        </button>
      </section>
      
      <div class="space-y-6">
        <!-- 基础偏好 -->
        <section>
          <div class="flex items-center gap-3 px-2 mb-3 opacity-30">
            <Palette class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('settings.appearance') }}</span>
          </div>
          <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm grainy-overlay">
            <button @click="router.push({ name: 'settings-theme' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 shadow-inner">
                <component :is="themeIcon[userStore.settings.theme] || Sun" class="w-5 h-5 text-purple-500" />
              </div>
              <div class="flex-1 text-left">
                <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.theme_title') }}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-black opacity-30 uppercase">{{ currentThemeLabel }}</span>
                <ChevronRight class="w-4 h-4 opacity-15" />
              </div>
            </button>
            
            <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.05]"></div>

            <button @click="router.push({ name: 'settings-language' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 shadow-inner">
                <Globe class="w-5 h-5 text-blue-500" />
              </div>
              <div class="flex-1 text-left">
                <div class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.language_title') }}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-black opacity-30 uppercase">{{ currentLanguageLabel }}</span>
                <ChevronRight class="w-4 h-4 opacity-15" />
              </div>
            </button>
          </div>
        </section>
        
        <!-- 安全与资产 -->
        <section>
          <div class="flex items-center gap-3 px-2 mb-3 opacity-30">
            <Shield class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('settings.security_data') }}</span>
          </div>
          <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm grainy-overlay">
            <button @click="router.push({ name: 'settings-privacy-lock' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 shadow-inner">
                <Shield class="w-5 h-5 text-green-500" />
              </div>
              <div class="flex-1 text-left text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.privacy_title') }}</div>
              <ChevronRight class="w-4 h-4 opacity-15" />
            </button>

            <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.05]"></div>

            <button @click="router.push({ name: 'settings-change-password' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 shadow-inner">
                <KeyRound class="w-5 h-5 text-amber-500" />
              </div>
              <div class="flex-1 text-left text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.change_password_title') }}</div>
              <ChevronRight class="w-4 h-4 opacity-15" />
            </button>

            <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.05]"></div>

            <button @click="router.push({ name: 'settings-data' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 shadow-inner">
                <Database class="w-5 h-5 text-orange-500" />
              </div>
              <div class="flex-1 text-left text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.data_title') }}</div>
              <ChevronRight class="w-4 h-4 opacity-15" />
            </button>
          </div>
        </section>
        
        <!-- 支持 -->
        <section class="mb-12">
          <div class="flex items-center gap-3 px-2 mb-3 opacity-30">
            <Bell class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('settings.support') }}</span>
          </div>
          <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm grainy-overlay">
            <button @click="router.push({ name: 'settings-feedback' })" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-500/10 shadow-inner">
                <MessageSquare class="w-5 h-5 text-slate-500" />
              </div>
              <div class="flex-1 text-left text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.feedback_title') }}</div>
              <ChevronRight class="w-4 h-4 opacity-15" />
            </button>

            <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.05]"></div>
            
            <button @click="handleLogout" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-red-500/5 transition-colors group">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 shadow-inner">
                <LogOut class="w-5 h-5 text-red-500" />
              </div>
              <div class="flex-1 text-left text-sm font-black tracking-tight text-red-500/80">{{ t('settings.logout') }}</div>
            </button>
          </div>
        </section>
      </div>
    </div>
    <SyncStatusIndicator />
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(40px) saturate(180%);
}
</style>
