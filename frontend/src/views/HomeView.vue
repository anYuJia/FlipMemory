<script lang="ts">
export default {
  name: 'HomeView'
}
</script>

<script setup lang="ts">
import { onMounted, onActivated, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore, useUserStore } from '@/stores'
import PullToRefresh from '@/components/ui/PullToRefresh.vue'
import FloatingAddButton from '@/components/layout/FloatingAddButton.vue'
import FlipCard from '@/components/memory/FlipCard.vue'
import { ChevronRight, Camera, Heart, ArrowRight, Sun, Moon, Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const memoryStore = useMemoryStore()
const userStore = useUserStore()
const { t, locale } = useI18n()

// 状态控制
const isInitialLoading = ref(true)
const hasLoadedOnce = ref(false)

// 问候语逻辑
const greetingKey = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return 'home.greeting.night'
  if (hour < 12) return 'home.greeting.morning'
  if (hour < 18) return 'home.greeting.afternoon'
  if (hour < 22) return 'home.greeting.evening'
  return 'home.greeting.night'
})

const greetingIcon = computed(() => {
  const hour = new Date().getHours()
  return (hour >= 6 && hour < 18) ? Sun : Moon
})

const currentDate = computed(() => {
  return new Intl.DateTimeFormat(locale.value, { 
    month: 'short', 
    day: 'numeric', 
    weekday: 'short' 
  }).format(new Date())
})

const recentMemories = computed(() => {
  const list = memoryStore.recentMemories || []
  return list.filter(m => m && m.id)
})
const featuredMemories = computed(() => recentMemories.value.slice(0, 3))
const extendedMemories = computed(() => featuredMemories.value.map(m => ({ memory: m || {} })))

const refreshData = async () => {
  const { year, month } = memoryStore.currentMonth
  await Promise.all([
    memoryStore.fetchRecentMemories(),
    memoryStore.fetchCalendarData(year, month)
  ])
}

onMounted(async () => {
  isInitialLoading.value = true
  try {
    await refreshData()
    hasLoadedOnce.value = true
  } finally {
    isInitialLoading.value = false
  }
})

onActivated(async () => {
  if (hasLoadedOnce.value) {
    await refreshData()
  }
})

const goToStats = () => router.push({ name: 'stats' })
const goToCalendar = () => router.push({ name: 'calendar' })
const handleRefresh = async () => await refreshData()
</script>

<template>
  <PullToRefresh @refresh="handleRefresh">
    <div class="page-container page-enter pb-32">
      <div class="max-w-lg mx-auto px-6">
        <!-- 顶部欢迎：紧凑排版 -->
        <header class="pt-12 pb-6 safe-area-top">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2.5">
              <span class="text-[9px] font-extrabold tracking-[0.2em] uppercase opacity-30">{{ currentDate }}</span>
              <div class="w-1 h-1 rounded-full bg-orange-400/40"></div>
              <component :is="greetingIcon" class="w-3 h-3 opacity-30" style="color: var(--color-primary);" />
            </div>
            <h1 class="text-3xl font-serif italic tracking-tight leading-tight" style="color: var(--text-primary);">
              {{ t('home.welcome', { greeting: t(greetingKey), name: userStore.displayName }) }}
            </h1>
          </div>
        </header>
        
        <!-- 本月概览：紧凑化 -->
        <section class="mb-8">
          <div class="relative overflow-hidden p-6 rounded-[2.2rem] card-static grainy-overlay group shadow-md">
            <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-[0.1] group-hover:opacity-15 transition-opacity duration-1000" style="background-color: var(--color-primary);"></div>
            
            <div class="relative flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[9px] font-black tracking-[0.1em] uppercase opacity-30 mb-1">{{ t('home.monthly_records') }}</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-serif italic tracking-tighter" style="color: var(--text-primary);">{{ memoryStore.memoriesThisMonth }}</span>
                  <span class="text-[10px] font-bold opacity-30 uppercase tracking-widest">{{ t('home.memories_unit') }}</span>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <button @click="goToCalendar" class="w-10 h-10 rounded-xl flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 btn-active">
                  <Camera class="w-5 h-5 opacity-40" />
                </button>
                <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10">
                  <span class="text-xl">✨</span>
                </div>
              </div>
            </div>
            
            <div class="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/[0.06] flex justify-between items-center">
              <div class="flex -space-x-2">
                <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white dark:border-white/10 overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm"></div>
              </div>
              <button @click="goToStats" class="text-[8px] font-black tracking-[0.1em] uppercase flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all">
                {{ t('home.view_trends') }} <ChevronRight class="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
        
        <!-- 精选记忆：紧凑化 -->
        <section class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <Sparkles class="w-3.5 h-3.5 text-orange-400 opacity-60" />
            <h2 class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40">{{ t('home.featured_title') }}</h2>
          </div>
          
          <div class="relative -mx-6">
            <div class="flex gap-4 overflow-x-auto pb-6 px-6 snap-x snap-mandatory hide-scrollbar">
              <div v-if="isInitialLoading && featuredMemories.length === 0" class="flex gap-4 px-6">
                <div v-for="i in 2" :key="i" class="flex-shrink-0 w-[260px] h-[340px] rounded-[2.5rem] skeleton opacity-50"></div>
              </div>
              <div v-else-if="featuredMemories.length === 0" class="w-full snap-center px-6">
                <div class="relative h-40 rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-black/5 dark:border-white/5 opacity-30">
                  <Heart class="w-7 h-7 mb-2 opacity-20" />
                  <span class="text-[9px] font-black uppercase tracking-[0.1em]">{{ t('home.no_featured') }}</span>
                </div>
              </div>
              <div v-for="(item, idx) in extendedMemories" :key="item.memory?.id || idx" class="flex-shrink-0 snap-center w-[260px] h-[340px]">
                <div v-if="item.memory" class="h-full shadow-lg transition-transform duration-700 hover:scale-[1.02]">
                  <FlipCard :memory="item.memory" />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 最近记忆：紧凑布局 -->
        <section class="pb-10">
          <div class="flex items-center justify-between mb-6">
            <div class="flex flex-col">
              <h2 class="text-2xl font-serif italic tracking-tight" style="color: var(--text-primary);">{{ t('home.recent_memories') }}</h2>
              <div class="w-8 h-0.5 mt-0.5 bg-gradient-accent opacity-60"></div>
            </div>
            <button @click="goToCalendar" class="flex items-center gap-2 py-2 px-4 rounded-xl card-static shadow-sm text-[8px] font-black uppercase tracking-[0.1em] btn-active">
              {{ t('common.all') }} <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div v-if="isInitialLoading && recentMemories.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="i in 4" :key="i" class="h-60 rounded-[2.5rem] skeleton opacity-50"></div>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="(memory, index) in recentMemories" :key="memory.id" class="h-[380px] shadow-lg rounded-[2.5rem] overflow-hidden transition-all duration-1000">
              <div :class="{ 'md:mt-10': index % 2 !== 0 }" class="h-full">
                <FlipCard :memory="memory" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <FloatingAddButton />
  </PullToRefresh>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar { display: none; }
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(40px) saturate(180%);
}
</style>
