<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ChevronLeft, ChevronRight, Activity, Zap, 
  Clock, Sparkles, TrendingUp
} from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const memoryStore = useMemoryStore()

// 状态
const selectedRange = ref('month')
const isLoadingStats = ref(false)
const selectedBarIndex = ref<number | null>(null)
const isVisible = ref(false)

// 基础统计数据
const stats = ref({
  totalMemories: 0,
  totalPhotos: 0,
  consecutiveDays: 0,
  moodDistribution: [] as any[],
  trend: [] as any[]
})

const moodDistribution = computed(() => {
  const dist = stats.value.moodDistribution || []
  const total = dist.reduce((sum, item) => sum + item.count, 0)
  return dist.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count)
})

const trendData = computed(() => stats.value.trend || [])
const maxTrendCount = computed(() => {
  const counts = trendData.value.map(t => t.count)
  return Math.max(...counts, 1)
})

async function loadStats() {
  isLoadingStats.value = true
  try {
    const { year, month } = memoryStore.currentMonth
    const data = await memoryStore.getStats(selectedRange.value, year, month)
    if (data) {
      stats.value = data
    }
  } finally {
    isLoadingStats.value = false
  }
}

function prevMonth() {
  memoryStore.prevMonth()
  loadStats()
}

function nextMonth() {
  memoryStore.nextMonth()
  loadStats()
}

function toggleBarSelection(index: number) {
  selectedBarIndex.value = selectedBarIndex.value === index ? null : index
}

onMounted(() => {
  loadStats()
  setTimeout(() => { isVisible.value = true }, 100)
})

watch(selectedRange, () => {
  loadStats()
})
</script>

<template>
  <div class="page-container page-enter pb-32">
    <div class="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
      <div class="absolute -top-[10%] -right-[10%] w-[60%] h-[40%] rounded-full blur-[120px] rotate-12" style="background: linear-gradient(135deg, var(--color-primary) 0%, transparent 100%);"></div>
      <div class="absolute top-[20%] -left-[10%] w-[50%] h-[30%] rounded-full blur-[100px] -rotate-12" style="background: linear-gradient(135deg, var(--color-accent) 0%, transparent 100%);"></div>
    </div>

    <div class="relative max-w-lg mx-auto px-7">
      <header class="pt-12 pb-6 safe-area-top">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <Activity class="w-3.5 h-3.5 opacity-30" />
            <span class="text-[9px] font-extrabold tracking-[0.2em] uppercase opacity-30">{{ t('nav.stats') }}</span>
          </div>
          <div class="flex items-end justify-between">
            <h1 class="text-3xl font-serif italic tracking-tight" style="color: var(--text-primary);">Insights</h1>
            
            <div class="flex p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 backdrop-blur-md">
              <button 
                v-for="r in ['month', 'year']" 
                :key="r"
                @click="selectedRange = r"
                class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-500"
                :class="selectedRange === r ? 'bg-white dark:bg-white/10 shadow-sm opacity-100' : 'opacity-30'"
              >
                {{ t(`stats.range_${r}`) }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section class="grid grid-cols-2 gap-4 mb-8">
        <div class="p-5 rounded-[2.2rem] card-static grainy-overlay">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10 mb-3 shadow-inner">
            <Sparkles class="w-4.5 h-4.5 text-orange-500" />
          </div>
          <div class="flex flex-col">
            <span class="text-[32px] font-serif italic tracking-tighter leading-none mb-1">{{ stats.totalMemories }}</span>
            <span class="text-[8px] font-black uppercase tracking-widest opacity-30">{{ t('home.monthly_records') }}</span>
          </div>
        </div>
        
        <div class="p-5 rounded-[2.2rem] card-static grainy-overlay">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 mb-3 shadow-inner">
            <TrendingUp class="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div class="flex flex-col">
            <span class="text-[32px] font-serif italic tracking-tighter leading-none mb-1">{{ stats.consecutiveDays }}</span>
            <span class="text-[8px] font-black uppercase tracking-widest opacity-30">{{ t('stats.streak_days') }}</span>
          </div>
        </div>
      </section>

      <section class="flex items-center justify-between mb-6 px-2">
        <button @click="prevMonth" class="btn-back scale-90 active:scale-75"><ChevronLeft class="w-5 h-5" /></button>
        <h3 class="text-base font-black tracking-tight" style="color: var(--text-primary);">
          {{ memoryStore.currentMonth.year }} / {{ String(memoryStore.currentMonth.month).padStart(2, '0') }}
        </h3>
        <button @click="nextMonth" class="btn-back scale-90 active:scale-75"><ChevronRight class="w-5 h-5" /></button>
      </section>

      <section class="mb-8">
        <div class="p-6 rounded-[2.5rem] card-static grainy-overlay flex flex-col min-h-[300px]">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1 h-3.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
            <h3 class="text-[9px] font-black tracking-[0.2em] uppercase opacity-30">{{ t('stats.activity_trend') }}</h3>
          </div>
          
          <div v-if="isLoadingStats" class="flex-1 flex items-end justify-between gap-2 pt-8 pb-4 px-1">
            <div v-for="i in 7" :key="i" class="flex-1 skeleton rounded-t-xl" :style="{ height: `${20 + Math.random() * 60}%` }"></div>
          </div>
          <div v-else-if="trendData.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-20">
            <Zap class="w-10 h-10 mb-2" />
            <p class="text-[9px] font-black uppercase tracking-widest">No Activity</p>
          </div>
          <div v-else class="flex-1 flex items-end justify-between gap-1.5 pt-10 relative pb-4 px-1">
            <div v-for="(item, index) in trendData" :key="item.label" 
              class="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end"
              @click="toggleBarSelection(index)"
            >
              <div v-if="item.count > 0" 
                class="mb-1 text-[9px] font-serif italic tracking-tighter transition-all duration-500"
                :style="{ 
                  color: selectedBarIndex === index ? 'var(--color-primary)' : 'var(--text-primary)',
                  opacity: selectedBarIndex === index ? '1' : '0.3',
                  transform: selectedBarIndex === index ? 'scale(1.2)' : 'scale(1)'
                }"
              >
                {{ item.count }}
              </div>
              
              <div class="w-full rounded-t-lg transition-all duration-1000 relative overflow-hidden"
                :style="{ 
                  background: selectedBarIndex === index ? 'var(--gradient-accent)' : 'var(--border-primary)', 
                  height: item.count > 0 ? `${Math.max((item.count / maxTrendCount) * 100, 15)}%` : '4px', 
                  opacity: selectedBarIndex === index ? '1' : (item.count > 0 ? '0.7' : '0.2'),
                  boxShadow: selectedBarIndex === index ? '0 8px 16px -4px var(--glow-dynamic)' : 'none'
                }"
              >
                <div v-if="item.count > 0" class="absolute top-0 inset-x-0 h-0.5 bg-white/20"></div>
              </div>
              <span class="text-[7px] font-black tracking-tighter uppercase mt-2.5" :style="{ opacity: selectedBarIndex === index ? '1' : '0.2' }">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-10">
        <div class="p-6 rounded-[2.5rem] card-static grainy-overlay">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-1 h-3.5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600"></div>
            <h3 class="text-[9px] font-black tracking-[0.2em] uppercase opacity-30">{{ t('stats.mood_dist') }}</h3>
          </div>
          
          <div v-if="isLoadingStats" class="space-y-5">
            <div v-for="i in 3" :key="i" class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-[1rem] skeleton opacity-40"></div>
              <div class="flex-1 space-y-2.5">
                <div class="h-2 w-20 skeleton opacity-40 rounded"></div>
                <div class="h-1 skeleton opacity-40 rounded"></div>
              </div>
            </div>
          </div>
          <div v-else-if="moodDistribution.length === 0" class="py-10 flex flex-col items-center justify-center opacity-20">
            <Clock class="w-10 h-10 mb-2" />
            <p class="text-[9px] font-black uppercase tracking-widest">No Moods</p>
          </div>
          <div v-else class="space-y-6">
            <div v-for="(item, index) in moodDistribution" :key="item.mood" 
              class="flex items-center gap-4 transition-all duration-700"
              :style="{ transitionDelay: `${index * 80}ms`, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateX(0)' : 'translateX(15px)' }"
            >
              <div class="w-12 h-12 rounded-[1rem] bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 flex items-center justify-center text-2xl shadow-sm">
                {{ MoodEmoji[item.mood as MoodType] }}
              </div>
              <div class="flex-1 flex flex-col gap-2">
                <div class="flex justify-between items-end">
                  <span class="text-[9px] font-black uppercase tracking-widest opacity-60">{{ t(`mood.${item.mood}`) }}</span>
                  <div class="flex items-baseline gap-0.5">
                    <span class="text-base font-serif italic">{{ item.percentage }}</span>
                    <span class="text-[7px] font-bold opacity-30">%</span>
                  </div>
                </div>
                <div class="h-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                  <div class="h-full rounded-full origin-left bg-gradient-to-r from-orange-400 to-orange-500 transition-transform duration-[1.2s]" 
                    :style="{ transform: isVisible ? `scaleX(${item.percentage / 100})` : 'scaleX(0)' }">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
