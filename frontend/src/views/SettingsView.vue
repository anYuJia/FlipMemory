<script setup lang="ts">
import { ref, onMounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { useOffline } from '@/composables/useOffline'
import { confirmLogout } from '@/composables/useConfirm'
import SyncStatusIndicator from '@/components/SyncStatusIndicator.vue'
import FeedbackDialog from '@/components/FeedbackDialog.vue'
import {
  Bell, Lock, Calendar,
  ChevronRight, Moon, Sun, Smartphone, LogOut,
  Cloud, HardDrive, RefreshCw, Trash2, MessageSquare, Sparkles
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const {
  totalPendingCount,
  syncStatusText,
  offlineModeEnabled,
  cacheStats,
  refreshCacheStats,
  clearSyncedCache,
} = useOffline()

const isLoaded = ref(false)
const hasAnimated = ref(false)
const scrollY = ref(0)
const isClearingCache = ref(false)
const showFeedbackDialog = ref(false)

const themeIcon = {
  light: Sun,
  dark: Moon,
  system: Smartphone,
}

const themeLabel = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
}

const toggleReminder = () => {
  userStore.toggleReminder()
}

const goToProfileSettings = () => router.push({ name: 'settings-profile' })
const goToThemeSettings = () => router.push({ name: 'settings-theme' })
const goToPrivacyLockSettings = () => router.push({ name: 'settings-privacy-lock' })

const handleLogout = async () => {
  const confirmed = await confirmLogout()
  if (confirmed) {
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

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
    setTimeout(() => {
      hasAnimated.value = true
    }, 600)
  }, 100)
})

onActivated(() => {
  if (scrollY.value > 0) {
    window.scrollTo(0, scrollY.value)
  }
})

onDeactivated(() => {
  scrollY.value = window.scrollY
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.15] dark:opacity-[0.1]"
        style="background-color: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/4 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.1] dark:opacity-[0.05]"
        style="background-color: var(--glow-secondary);"
      />
    </div>
    
    <!-- 主内容区域 -->
    <div class="relative max-w-lg mx-auto px-6">
      <!-- 头部 -->
      <header 
        class="pt-16 pb-8 safe-area-top"
        :class="{ 'animate-slide-up': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Preferences</span>
            <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">
            应用<span class="text-gradient">设置</span>
          </h1>
        </div>
      </header>
      
      <!-- 用户信息：高级个人名片 -->
      <section 
        class="mb-10"
        :class="{ 'animate-slide-up delay-100': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <button 
          @click="goToProfileSettings"
          class="w-full relative overflow-hidden p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xl transition-all duration-500 hover:scale-[1.02] active:scale-95 group"
        >
          <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-orange-400 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          
          <div class="relative flex items-center gap-5">
            <div class="relative">
              <div 
                class="w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl overflow-hidden shadow-2xl border-4 border-white/50 dark:border-white/10"
                style="background: var(--gradient-accent);"
              >
                <img 
                  v-if="userStore.profile?.avatarUrl" 
                  :src="userStore.profile.avatarUrl" 
                  class="w-full h-full object-cover"
                />
                <span v-else class="drop-shadow-lg">👤</span>
              </div>
              <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-black/5 flex items-center justify-center shadow-sm">
                <Sparkles class="w-3.5 h-3.5 text-orange-400" />
              </div>
            </div>
            
            <div class="flex-1 text-left">
              <h3 class="text-xl font-black tracking-tight" style="color: var(--text-primary);">{{ userStore.displayName }}</h3>
              <p class="text-[10px] font-black tracking-widest uppercase opacity-30 mt-1">Premium Member</p>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 mt-3">
                <span class="text-[9px] font-black uppercase tracking-wider opacity-40">Edit Profile</span>
                <ChevronRight class="w-3 h-3 opacity-20" />
              </div>
            </div>
          </div>
        </button>
      </section>
      
      <!-- 设置分组：显示与交互 -->
      <section class="mb-8">
        <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 px-2 mb-3 block">Appearance & Interaction</span>
        <div class="rounded-[2.5rem] overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
          <button @click="goToThemeSettings" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 shadow-sm">
              <component :is="themeIcon[userStore.theme]" class="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">主题外观</div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold opacity-30">{{ themeLabel[userStore.theme] }}</span>
              <ChevronRight class="w-4 h-4 opacity-20" />
            </div>
          </button>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          
          <div class="flex items-center gap-4 px-6 py-5">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-50 dark:bg-orange-500/10 shadow-sm">
              <Bell class="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold tracking-tight" style="color: var(--text-primary);">每日提醒</div>
              <div class="text-[10px] font-medium opacity-30 uppercase tracking-wider mt-0.5">21:00 Daily</div>
            </div>
            <button @click="toggleReminder" class="relative w-12 h-7 rounded-full transition-all duration-500"
              :style="{ background: userStore.settings.reminderEnabled ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)' }">
              <div class="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-500"
                :style="{ left: userStore.settings.reminderEnabled ? '24px' : '4px' }"></div>
            </button>
          </div>
        </div>
      </section>
      
      <!-- 设置分组：数据与隐私 -->
      <section class="mb-8">
        <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 px-2 mb-3 block">Security & Storage</span>
        <div class="rounded-[2.5rem] overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
          <button @click="goToPrivacyLockSettings" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-green-50 dark:bg-green-500/10 shadow-sm">
              <Lock class="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            <div class="flex-1 text-left text-sm font-bold tracking-tight" style="color: var(--text-primary);">隐私锁</div>
            <ChevronRight class="w-4 h-4 opacity-20" />
          </button>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>
          
          <div class="flex items-center gap-4 px-6 py-5">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 shadow-sm">
              <Cloud class="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-bold tracking-tight" style="color: var(--text-primary);">同步状态</div>
              <div class="text-[10px] font-medium opacity-30 uppercase tracking-wider mt-0.5">{{ totalPendingCount > 0 ? syncStatusText : 'Synced' }}</div>
            </div>
            <SyncStatusIndicator :show-text="false" size="md" />
          </div>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <div class="flex items-center gap-4 px-6 py-5">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-500/10 shadow-sm">
              <HardDrive class="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-sm font-bold tracking-tight" style="color: var(--text-primary);">本地缓存</div>
              <div class="text-[10px] font-medium opacity-30 uppercase tracking-wider mt-0.5">{{ cacheStats?.storageUsage || '...' }} Used</div>
            </div>
            <button @click="handleClearCache" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <Trash2 v-if="!isClearingCache" class="w-4 h-4 text-red-400 opacity-40" />
              <RefreshCw v-else class="w-4 h-4 text-red-400 animate-spin" />
            </button>
          </div>
        </div>
      </section>
      
      <!-- 设置分组：其它操作 -->
      <section class="mb-12 pb-32">
        <div class="rounded-[2.5rem] overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm">
          <button @click="showFeedbackDialog = true" class="w-full flex items-center gap-4 px-6 py-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
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
            <div class="flex-1 text-left text-sm font-black tracking-tight text-red-500/80 group-hover:text-red-500 transition-colors">退出登录</div>
          </button>
        </div>
        
        <div class="mt-10 text-center flex flex-col gap-1">
          <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-20" style="color: var(--text-primary);">FlipMemory v1.0.0</span>
          <span class="text-[10px] font-bold opacity-10 uppercase tracking-widest" style="color: var(--text-primary);">Made with ❤️</span>
        </div>
      </section>
    </div>

    <!-- 反馈对话框 -->
    <FeedbackDialog v-model:visible="showFeedbackDialog" />
  </div>
</template>

<style scoped>
:deep(.text-gradient) {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
