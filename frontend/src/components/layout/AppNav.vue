<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { Home, Calendar, Sparkles, BarChart3, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const navItems = [
  { name: 'home', icon: Home, label: 'nav.home' },
  { name: 'calendar', icon: Calendar, label: 'nav.calendar' },
  { name: 'flashback', icon: Sparkles, label: 'nav.flashback' },
  { name: 'stats', icon: BarChart3, label: 'nav.stats' },
  { name: 'settings', icon: Settings, label: 'nav.settings' },
]

// 核心主页面名单
const mainPages = ['home', 'calendar', 'flashback', 'stats', 'settings']
const showNav = computed(() => mainPages.includes(route.name as string))

const isActive = (name: string) => route.name === name
const navigate = (name: string) => router.push({ name })
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="translate-y-20 opacity-0"
    leave-to-class="translate-y-20 opacity-0"
  >
    <nav v-if="showNav" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-md:w-[calc(100%-2rem)] max-w-md">
    <div class="absolute inset-0 rounded-[2rem] shadow-2xl backdrop-blur-3xl saturate-[180%] border border-white/10 dark:border-white/5" style="background: var(--nav-bg);" />
    <div class="relative flex items-center justify-between h-20 px-4">
      <button v-for="item in navItems" :key="item.name" @click="navigate(item.name)" class="relative flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 group">
        <div v-if="isActive(item.name)" class="absolute inset-x-2 inset-y-3 rounded-2xl bg-orange-400/10 dark:bg-orange-400/5 animate-fade-in" />
        <div class="relative transition-transform duration-300 group-hover:-translate-y-1">
          <component :is="item.icon" class="w-5.5 h-5.5 transition-all duration-500" :stroke-width="isActive(item.name) ? 2.5 : 2" :style="{ color: isActive(item.name) ? 'var(--color-primary)' : 'var(--text-tertiary)', filter: isActive(item.name) ? 'drop-shadow(0 4px 8px rgba(251, 146, 60, 0.3))' : 'none' }" />
        </div>
        <span class="text-[9px] font-black uppercase tracking-[0.1em] mt-1.5 transition-all duration-300" :style="{ color: isActive(item.name) ? 'var(--color-primary)' : 'var(--text-tertiary)', opacity: isActive(item.name) ? '1' : '0.4' }">
          {{ $t(item.label) }}
        </span>
        <div v-if="isActive(item.name)" class="absolute bottom-2.5 w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,1)] animate-pulse" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
</style>
