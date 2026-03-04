<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft, ChevronRight, Activity, Zap, ShieldCheck, 
  Clock, HardDrive, BarChart3
} from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji } from '@/types/memory'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { useI18n } from 'vue-i18n'
import { performanceMonitor } from '@/services/performanceMonitor'

const router = useRouter()
const memoryStore = useMemoryStore()
const { t, locale } = useI18n()

const isLoaded = ref(true)
const isLoadingStats = ref(false)
const activeRange = ref('month')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const currentWeek = ref(1)
const selectedBarIndex = ref<number | null>(null)

// 性能数据响应式快照
const perfData = ref(performanceMonitor.getSummary())
let perfTimer: number | null = null

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
        moodDistribution: data.moodDistribution || [],
        trend: data.trend || []
      }
    }
    updatePerfSnapshot()
  } finally {
    isLoadingStats.value = false
  }
}

const updatePerfSnapshot = () => {
  perfData.value = performanceMonitor.getSummary()
}

watch([activeRange, currentYear, currentMonth, currentWeek], fetchStats)

onMounted(async () => {
  await fetchStats()
  // 每 5 秒自动刷新性能指标
  perfTimer = window.setInterval(updatePerfSnapshot, 5000)
})

onUnmounted(() => {
  if (perfTimer) clearInterval(perfTimer)
})

const goPrev = () => {
  if (activeRange.value === 'month') {
    if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
    else { currentMonth.value-- }
  } else if (activeRange.value === 'year') {
    currentYear.value--
  }
}

const goNext = () => {
  if (activeRange.value === 'month') {
    if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
    else { currentMonth.value++ }
  } else if (activeRange.value === 'year') {
    currentYear.value++
  }
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
  if (activeRange.value === 'month') {
    return new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long' }).format(new Date(currentYear.value, currentMonth.value - 1))
  }
  if (activeRange.value === 'year') return `${currentYear.value}`
  if (activeRange.value === 'week') return t('stats.week_num', { num: currentWeek.value })
  return t('common.all')
})

const toggleBarSelection = (index: number) => {
  selectedBarIndex.value = selectedBarIndex.value === index ? null : index
}
</script>

<template>
  <div class="page-container relative pb-32">
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-6 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.subtitle') }}</span>
            <div class="w-1.5 h-1.5 rounded-full bg-orange-400 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('stats.title') }}</h1>
        </div>
      </header>
      
      <!-- 范围切换 -->
      <section class="mb-8">
        <div class="p-1.5 rounded-[1.5rem] card-static shadow-sm relative">
          <div class="relative flex">
            <div class="absolute top-0 h-full rounded-[1.25rem] transition-all duration-500 ease-out bg-white dark:bg-white/10 shadow-sm border border-white/20 dark:border-white/5"
              :style="{ width: `${100 / timeRanges.length}%`, transform: `translateX(${activeRangeIndex * 100}%)` }" />
            <button v-for="range in timeRanges" :key="range.key" @click="activeRange = range.key"
              class="relative flex-1 py-3 text-center text-[11px] font-black tracking-widest uppercase transition-all duration-300 z-10"
              :style="{ color: activeRange === range.key ? 'var(--text-primary)' : 'var(--text-tertiary)' }">
              {{ range.label }}
            </button>
          </div>
        </div>
        
        <div v-if="activeRange !== 'all'" class="flex items-center justify-between mt-6 px-2">
          <button @click="goPrev" class="btn-back w-10 h-10 rounded-2xl">
            <ChevronLeft class="w-4 h-4 opacity-40" />
          </button>
          <div class="flex flex-col items-center">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-30" style="color: var(--text-primary);">{{ t(`common.${activeRange}`) }}</span>
            <span class="text-sm font-black tracking-tight mt-0.5" style="color: var(--text-primary);">{{ timeLabel }}</span>
          </div>
          <button @click="goNext" class="btn-back w-10 h-10 rounded-2xl">
            <ChevronRight class="w-4 h-4 opacity-40" />
          </button>
        </div>
      </section>
      
      <!-- 核心指标 -->
      <section class="mb-10">
        <SkeletonLoader v-if="isLoadingStats" type="stats" />
        <div v-else class="grid grid-cols-2 gap-4">
          <div class="p-6 rounded-[2.5rem] card-static shadow-sm flex flex-col justify-between relative overflow-hidden group border-l-4 border-l-orange-400">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-orange-400 rounded-full blur-[40px] opacity-[0.05] transition-transform duration-1000 group-hover:scale-125"></div>
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.total_memories') }}</span>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="text-5xl font-black tracking-tighter" style="color: var(--text-primary);">{{ stats.totalMemories }}</span>
              <span class="text-[10px] font-bold opacity-40 uppercase">{{ t('stats.unit_entries') }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex-1 p-5 rounded-[2.2rem] card-static shadow-sm flex flex-col justify-center border-l-4 border-l-blue-500">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.streak') }}</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-blue-600 dark:text-blue-400">{{ stats.consecutiveDays }}</span>
                <span class="text-[10px] font-bold text-blue-600/50 uppercase">{{ t('stats.unit_days') }}</span>
              </div>
            </div>
            <div class="flex-1 p-5 rounded-[2.2rem] card-static shadow-sm flex flex-col justify-center border-l-4 border-l-purple-500">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.photos') }}</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-purple-600 dark:text-purple-400">{{ stats.totalPhotos }}</span>
                <span class="text-[10px] font-bold text-purple-600/50 uppercase">{{ t('stats.unit_pics') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 趋势与分布 -->
      <div class="grid grid-cols-1 gap-6 mb-10">
        <!-- 情绪分布 -->
        <div class="p-6 rounded-[2.5rem] card-static shadow-sm">
          <div class="flex items-center gap-2 mb-6">
            <div class="w-1 h-4 rounded-full bg-orange-400"></div>
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.mood_dist') }}</h3>
          </div>
          <div class="space-y-5">
            <div v-for="item in moodDistribution" :key="item.mood" class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-xl border border-black/5 dark:border-white/10">{{ MoodEmoji[item.mood as keyof typeof MoodEmoji] }}</div>
              <div class="flex-1 flex flex-col gap-2">
                <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest" style="color: var(--text-primary);">
                  <span class="opacity-60">{{ item.percentage }}%</span>
                  <span class="opacity-20">{{ item.count }} {{ t('stats.unit_entries') }}</span>
                </div>
                <div class="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full origin-left bg-orange-400 transition-transform duration-1000" :style="{ transform: `scaleX(${item.percentage / 100})` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 活动趋势 -->
        <div class="p-6 rounded-[2.5rem] card-static shadow-sm h-full flex flex-col min-h-[300px]">
          <div class="flex items-center gap-2 mb-8">
            <div class="w-1 h-4 rounded-full bg-blue-500"></div>
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.activity_trend') }}</h3>
          </div>
          <div class="flex-1 flex items-end justify-between gap-3 pt-8 relative pb-2 px-2">
            <div v-for="(item, index) in trendData" :key="item.label" class="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end" @click="toggleBarSelection(index)">
              <div class="mb-2 px-2 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[9px] font-black tracking-tighter transition-all"
                :class="selectedBarIndex === index && item.count > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'">{{ item.count }}</div>
              <div class="w-full rounded-t-xl transition-all duration-700"
                :style="{ background: selectedBarIndex === index ? 'var(--color-primary)' : 'var(--border-primary)', height: item.count > 0 ? `${Math.max((item.count / maxTrendCount) * 100, 15)}%` : '6px', opacity: selectedBarIndex === index ? '1' : (item.count > 0 ? '0.6' : '0.2') }">
              </div>
              <span class="text-[8px] font-black tracking-tighter uppercase mt-4" style="color: var(--text-primary);" :style="{ opacity: selectedBarIndex === index ? '1' : '0.3' }">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统健康度 (Vitals) -->
      <section class="mb-12">
        <div class="flex items-center gap-2 mb-4 px-1">
          <Activity class="w-4 h-4 opacity-40" style="color: var(--text-primary);" />
          <h2 class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('stats.system_health') }}</h2>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="p-4 rounded-[1.5rem] card-static shadow-sm flex flex-col items-center text-center gap-2">
            <Zap class="w-5 h-5 text-yellow-500" />
            <div class="text-[14px] font-black" style="color: var(--text-primary);">{{ (perfData.lcp || 0).toFixed(0) }}ms</div>
            <span class="text-[8px] font-black uppercase opacity-30 tracking-widest">{{ t('stats.vitals.load') }}</span>
          </div>
          <div class="p-4 rounded-[1.5rem] card-static shadow-sm flex flex-col items-center text-center gap-2">
            <Clock class="w-5 h-5 text-blue-500" />
            <div class="text-[14px] font-black" style="color: var(--text-primary);">{{ (perfData.apiAvg || 0).toFixed(0) }}ms</div>
            <span class="text-[8px] font-black uppercase opacity-30 tracking-widest">{{ t('stats.vitals.network') }}</span>
          </div>
          <div class="p-4 rounded-[1.5rem] card-static shadow-sm flex flex-col items-center text-center gap-2">
            <ShieldCheck class="w-5 h-5 text-green-500" />
            <div class="text-[14px] font-black" style="color: var(--text-primary);">{{ (perfData.health || 100) }}%</div>
            <span class="text-[8px] font-black uppercase opacity-30 tracking-widest">{{ t('stats.vitals.health') }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
.btn-back {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.btn-back:active { transform: scale(0.9); }
</style>
