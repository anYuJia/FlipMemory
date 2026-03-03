<script lang="ts">
export default {
  name: 'HomeView'
}
</script>

<script setup lang="ts">
import { onMounted, computed, ref, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore, useUserStore } from '@/stores'
import { useResponsive } from '@/composables/useResponsive'
import PullToRefresh from '@/components/ui/PullToRefresh.vue'
import FloatingAddButton from '@/components/layout/FloatingAddButton.vue'
import FlipCard from '@/components/memory/FlipCard.vue'
import { ChevronRight, Camera, Heart, ArrowRight, Sun, Moon, Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const memoryStore = useMemoryStore()
const userStore = useUserStore()
const { isDesktop } = useResponsive()
const { t } = useI18n()

const isLoaded = ref(false)
const hasAnimated = ref(false)
const carouselRef = ref<HTMLElement | null>(null)

// 问候语逻辑
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return t('home.greeting.morning')
  if (hour < 18) return t('home.greeting.afternoon')
  if (hour < 22) return t('home.greeting.evening')
  return t('home.greeting.night')
})

const greetingIcon = computed(() => {
  const hour = new Date().getHours()
  return (hour >= 6 && hour < 18) ? Sun : Moon
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
})

// 记忆数据
const featuredMemories = computed(() => memoryStore.featuredMemories)
const recentMemories = computed(() => memoryStore.recentMemories)

// 轮播配置
const carouselCardWidth = computed(() => '280px')
const extendedMemories = computed(() => {
  return featuredMemories.value.map(m => ({ memory: m }))
})

onMounted(async () => {
  if (memoryStore.recentMemories.length === 0) {
    await memoryStore.fetchRecentMemories()
  }
  setTimeout(() => {
    isLoaded.value = true
    setTimeout(() => { hasAnimated.value = true }, 800)
  }, 100)
})

const goToStats = () => router.push({ name: 'stats' })
const goToCalendar = () => router.push({ name: 'calendar' })

const handleRefresh = async () => {
  await memoryStore.fetchRecentMemories()
}
</script>

<template>
  <PullToRefresh @refresh="handleRefresh">
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景光晕 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.04]" style="background-color: var(--glow-primary);" />
      <div class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.08] dark:opacity-[0.03]" style="background-color: var(--glow-secondary);" />
    </div>

    <!-- 主内容区域 -->
    <div class="relative max-w-lg mx-auto px-6">
      <!-- 顶部欢迎 -->
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ currentDate }}</span>
            <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
            <component :is="greetingIcon" class="w-3.5 h-3.5 opacity-40" style="color: var(--color-primary);" />
          </div>
          <h1 class="text-3xl font-black tracking-tighter mt-1" style="color: var(--text-primary);">
            {{ greeting }}，<span class="text-gradient">{{ userStore.displayName }}</span>
          </h1>
          <p class="text-sm font-medium mt-1 opacity-40" style="color: var(--text-primary);">
            {{ t('home.sub_greeting') }}
          </p>
        </div>
      </header>
      
      <!-- 本月概览 -->
      <section class="mb-10 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="relative overflow-hidden p-6 rounded-[2.5rem] card-static shadow-xl group">
          <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-[0.08] group-hover:opacity-20 transition-opacity duration-700" style="background-color: var(--color-primary);"></div>
          
          <div class="relative flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[11px] font-black tracking-widest uppercase opacity-40 mb-1" style="color: var(--text-primary);">{{ t('home.monthly_records') }}</span>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ memoryStore.memoriesThisMonth }}</span>
                <span class="text-sm font-bold opacity-40" style="color: var(--text-primary);">{{ t('home.memories_unit') }}</span>
              </div>
            </div>

            <div class="flex items-center gap-6">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <Camera class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
                </div>
                <span class="text-[9px] font-black opacity-30 uppercase tracking-tighter" style="color: var(--text-primary);">Photo</span>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <span class="text-xl">😊</span>
                </div>
                <span class="text-[9px] font-black opacity-30 uppercase tracking-tighter" style="color: var(--text-primary);">Mood</span>
              </div>
            </div>
          </div>
          
          <div class="mt-5 pt-4 border-t border-black/[0.03] dark:border-white/[0.03] flex justify-between items-center">
            <div class="flex -space-x-2">
              <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white/50 dark:border-white/10 overflow-hidden bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <button @click="goToStats" class="text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all" style="color: var(--text-primary);">
              {{ t('home.view_trends') }} <ChevronRight class="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>
      
      <!-- 精选记忆轮播 -->
      <section class="mb-10 transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center gap-2 mb-4">
          <Sparkles class="w-4 h-4 opacity-40" />
          <h2 class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('home.featured_title') }}</h2>
        </div>
        
        <div class="relative -mx-6">
          <div ref="carouselRef" class="flex gap-4 overflow-x-auto pb-6 px-6 snap-x snap-mandatory hide-scrollbar">
            <div v-if="featuredMemories.length === 0" class="w-full snap-center">
              <div class="relative h-48 rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-dashed border-black/5 dark:border-white/5 opacity-40 hover:opacity-60 transition-all">
                <Heart class="w-8 h-8 mb-2 opacity-20" />
                <span class="text-xs font-bold uppercase tracking-widest">{{ t('home.no_featured') }}</span>
              </div>
            </div>

            <div v-for="(item, idx) in extendedMemories" :key="`${item.memory.id}-${idx}`" class="flex-shrink-0 snap-center" :style="{ width: carouselCardWidth }">
              <div class="h-[320px] shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <FlipCard :memory="item.memory" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 最近记忆 -->
      <section class="pb-32 transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center justify-between mb-6">
          <div class="flex flex-col">
            <h2 class="text-2xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('home.recent_memories') }}</h2>
            <div class="w-8 h-1 rounded-full mt-1 bg-orange-400 opacity-40"></div>
          </div>
          <button @click="goToCalendar" class="flex items-center gap-2 py-2.5 px-5 rounded-full card-static shadow-sm text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
            {{ t('common.all') }} <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div v-for="(memory, index) in recentMemories" :key="memory.id" class="relative transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(40px)', transitionDelay: `${0.3 + index * 0.15}s` }">
            <div :class="{ 'md:mt-12': index % 2 !== 0 }">
              <div class="shadow-xl rounded-[2.5rem] overflow-hidden">
                <FlipCard :memory="memory" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    <FloatingAddButton />
  </div>
  </PullToRefresh>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
