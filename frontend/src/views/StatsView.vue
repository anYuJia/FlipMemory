<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji } from '@/types/memory'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const memoryStore = useMemoryStore()
const { t } = useI18n()

const isLoaded = ref(false)
const hasAnimated = ref(false)
const isLoadingStats = ref(false)
const activeRange = ref('month')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const currentWeek = ref(1)
const selectedBarIndex = ref<number | null>(null)

const timeRanges = computed(() => [
  { key: 'week', label: t('common.week') },
  { key: 'month', label: t('common.month') },
  { key: 'year', label: t('common.year') },
  { key: 'all', label: t('common.all') }
])

const activeRangeIndex = computed(() => timeRanges.value.findIndex(r => r.key === activeRange.value))

const stats = ref({
  totalMemories: 0,
  totalPhotos: 0,
  consecutiveDays: 0,
  periodCount: 0,
  moodDistribution: [] as any[],
  trend: [] as any[]
})

const fetchStats = async () => {
  isLoadingStats.value = true
  try {
    const data = await memoryStore.getStats(activeRange.value, currentYear.value, currentMonth.value, currentWeek.value)
    if (data) {
      stats.value = {
        totalMemories: data.totalMemories || 0,
        totalPhotos: data.totalPhotos || 0,
        consecutiveDays: data.consecutiveDays || 0,
        periodCount: data.periodCount || 0,
        moodDistribution: data.moodDistribution || [],
        trend: data.trend || []
      }
    }
  } finally {
    isLoadingStats.value = false
  }
}

watch([activeRange, currentYear, currentMonth, currentWeek], fetchStats)

onMounted(async () => {
  await fetchStats()
  setTimeout(() => {
    isLoaded.value = true
    setTimeout(() => { hasAnimated.value = true }, 800)
  }, 100)
})

const goPrev = () => {
  if (activeRange.value === 'month') {
    if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
    else { currentMonth.value-- }
  } else if (activeRange.value === 'year') { currentYear.value-- }
}

const goNext = () => {
  if (activeRange.value === 'month') {
    if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
    else { currentMonth.value++ }
  } else if (activeRange.value === 'year') { currentYear.value++ }
}

const moodDistribution = computed(() => {
  const dist = stats.value.moodDistribution || []
  const total = dist.reduce((acc, curr) => acc + (curr.count || 0), 0)
  return dist.map(m => ({
    ...m,
    percentage: total > 0 ? Math.round(((m.count || 0) / total) * 100) : 0
  })).sort((a, b) => (b.count || 0) - (a.count || 0))
})

const trendData = computed(() => stats.value.trend || [])
const maxTrendCount = computed(() => {
  const counts = trendData.value.map(t => t.count || 0)
  return counts.length > 0 ? Math.max(...counts, 1) : 1
})

const timeLabel = computed(() => {
  if (activeRange.value === 'month') return `${currentYear.value} / ${currentMonth.value}`
  if (activeRange.value === 'year') return `${currentYear.value}`
  return t('common.all')
})

const toggleBarSelection = (index: number) => {
  selectedBarIndex.value = selectedBarIndex.value === index ? null : index
}
</script>

<template>
  <div class="page-container relative">
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-6 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ $t('stats.subtitle') }}</span>
            <div class="w-1 h-1 rounded-full bg-blue-500 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('stats.title') }}</h1>
        </div>
      </header>
      
      <!-- 切换器 -->
      <section class="mb-8 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="p-1.5 rounded-[1.5rem] card-static shadow-sm relative">
          <div class="relative flex">
            <div class="absolute top-0 h-full rounded-[1.25rem] transition-all duration-500 ease-out bg-white dark:bg-white/10 shadow-sm"
              :style="{ width: `${100 / timeRanges.length}%`, left: `${(activeRangeIndex * 100) / timeRanges.length}%` }" />
            <button v-for="range in timeRanges" :key="range.key" @click="activeRange = range.key"
              class="relative flex-1 py-3 text-center text-[11px] font-black tracking-widest uppercase transition-all duration-300 z-10"
              :style="{ color: activeRange === range.key ? 'var(--text-primary)' : 'var(--text-tertiary)' }">
              {{ range.label }}
            </button>
          </div>
        </div>
        
        <div v-if="activeRange !== 'all'" class="flex items-center justify-between mt-6 px-2">
          <button @click="goPrev" class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90 shadow-sm">
            <ChevronLeft class="w-4 h-4 opacity-40" style="color: var(--text-primary);" />
          </button>
          <div class="flex flex-col items-center">
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ activeRange }}</span>
            <span class="text-sm font-bold tracking-tight mt-0.5" style="color: var(--text-primary);">{{ timeLabel }}</span>
          </div>
          <button @click="goNext" class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90 shadow-sm">
            <ChevronRight class="w-4 h-4 opacity-40" style="color: var(--text-primary);" />
          </button>
        </div>
      </section>
      
      <!-- 看板 -->
      <section class="mb-8 transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <SkeletonLoader v-if="isLoadingStats" type="stats" />
        <div v-else class="grid grid-cols-2 gap-4">
          <div class="p-6 rounded-[2rem] bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-500/10 dark:to-orange-950/20 border border-orange-200/50 dark:border-orange-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-orange-400 rounded-full blur-[40px] opacity-20 dark:opacity-10"></div>
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 text-orange-800 dark:text-orange-300">{{ $t('stats.total_memories') }}</span>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="text-5xl font-black tracking-tighter text-orange-600 dark:text-orange-400">{{ stats.totalMemories }}</span>
              <span class="text-[10px] font-bold text-orange-600/50 dark:text-orange-400/50 uppercase">{{ $t('stats.unit_entries') }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex-1 p-5 rounded-[2rem] card-static shadow-sm flex flex-col justify-center">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ $t('stats.streak') }}</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-blue-600 dark:text-blue-400">{{ stats.consecutiveDays }}</span>
                <span class="text-[10px] font-bold text-blue-600/50 uppercase">{{ $t('stats.unit_days') }}</span>
              </div>
            </div>
            <div class="flex-1 p-5 rounded-[2rem] card-static shadow-sm flex flex-col justify-center">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ $t('stats.photos') }}</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-purple-600 dark:text-purple-400">{{ stats.totalPhotos }}</span>
                <span class="text-[10px] font-bold text-purple-600/50 uppercase">{{ $t('stats.unit_pics') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-32 transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <!-- 情绪 -->
        <section>
          <div class="p-6 rounded-[2rem] card-static shadow-sm">
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mb-6" style="color: var(--text-primary);">{{ $t('stats.mood_dist') }}</h3>
            <div class="space-y-4">
              <div v-for="item in moodDistribution" :key="item.mood" class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-2xl bg-white/50 dark:bg-white/10 flex items-center justify-center text-xl shadow-sm border border-white/20">{{ MoodEmoji[item.mood as keyof typeof MoodEmoji] }}</div>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                    <span class="opacity-60">{{ item.percentage }}%</span>
                    <span class="opacity-30">{{ item.count }}</span>
                  </div>
                  <div class="h-1.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                    <div class="h-full rounded-full origin-left bg-gradient-accent" :style="{ transform: `scaleX(${item.percentage / 100})` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 趋势 -->
        <section>
          <div class="p-6 rounded-[2rem] card-static shadow-sm h-full flex flex-col">
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mb-6" style="color: var(--text-primary);">{{ $t('stats.activity_trend') }}</h3>
            <div class="flex-1 flex items-end justify-between gap-2 pt-8 relative">
              <div v-for="(item, index) in trendData" :key="item.label" class="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end" @click="toggleBarSelection(index)">
                <div class="mb-2 px-2 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold tracking-wider transition-all"
                  :class="selectedBarIndex === index && item.count > 0 ? 'opacity-100' : 'opacity-0'">{{ item.count }}</div>
                <div class="w-full rounded-t-xl transition-all duration-500"
                  :style="{ background: selectedBarIndex === index ? 'var(--color-primary)' : 'var(--text-muted)', height: item.count > 0 ? `${Math.max((item.count / maxTrendCount) * 100, 10)}%` : '4px', opacity: selectedBarIndex === index ? '1' : (item.count > 0 ? '0.6' : '0.2') }"></div>
                <span class="text-[9px] font-black tracking-widest uppercase mt-3" style="color: var(--text-primary);" :style="{ opacity: selectedBarIndex === index ? '1' : '0.4' }">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
</style>
