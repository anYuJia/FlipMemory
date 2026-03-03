<script lang="ts">
export default {
  name: 'StatsView'
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onActivated, onDeactivated } from 'vue'
import { BarChart3, Camera, TrendingUp, Flame, ChevronLeft, ChevronRight, Calendar } from 'lucide-vue-next'
import { MoodEmoji } from '@/types/memory'
import { useMemoryStore } from '@/stores'
import { logger } from '@/services/logger'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const memoryStore = useMemoryStore()
const isLoaded = ref(false)
const isLoadingStats = ref(true)
const hasAnimated = ref(false) // 标记是否已播放过入场动画
const scrollY = ref(0)

// 统计数据类型
interface TrendItem {
  label: string
  count: number
}

interface MoodItem {
  mood: string
  count: number
}

interface StatsData {
  totalMemories: number
  totalPhotos: number
  consecutiveDays: number
  periodCount: number
  moodDistribution?: MoodItem[]
  trend?: TrendItem[]
}

// 统计数据
const statsData = ref<StatsData | null>(null)

// 时间范围类型
type TimeRange = 'all' | 'year' | 'month' | 'week'
const activeRange = ref<TimeRange>('all')

// 当前选中的时间
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const currentWeek = ref(1) // 当年第几周

// 时间范围选项（使用 const 断言避免重复创建）
const timeRanges: readonly { key: TimeRange; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'year', label: '年度' },
  { key: 'month', label: '月份' },
  { key: 'week', label: '周' },
] as const

// 当前选中的范围索引（缓存计算结果）
const activeRangeIndex = computed(() => 
  timeRanges.findIndex(t => t.key === activeRange.value)
)

// 计算当前周数（年内周数）
const getWeekNumber = (date: Date) => {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// 初始化当前周
currentWeek.value = getWeekNumber(new Date())

// 根据年份和周数获取该周的起始日期
const getWeekStartDate = (year: number, week: number) => {
  const startOfYear = new Date(year, 0, 1)
  const daysOffset = (week - 1) * 7 - startOfYear.getDay()
  return new Date(year, 0, 1 + daysOffset)
}

// 获取周的日期范围
const getWeekDateRange = (year: number, week: number) => {
  const weekStart = getWeekStartDate(year, week)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
}

// 获取周所在的月份以及是该月的第几周
const getMonthWeekLabel = (year: number, week: number) => {
  const weekStart = getWeekStartDate(year, week)
  const month = weekStart.getMonth() + 1
  // 计算是该月的第几周
  const firstDayOfMonth = new Date(year, weekStart.getMonth(), 1)
  const firstWeekday = firstDayOfMonth.getDay()
  const dayOfMonth = weekStart.getDate()
  const weekOfMonth = Math.ceil((dayOfMonth + firstWeekday) / 7)
  return `${month}月第${weekOfMonth}周`
}

// 显示的时间标签
const timeLabel = computed(() => {
  switch (activeRange.value) {
    case 'all':
      return '全部时间'
    case 'year':
      return `${currentYear.value}年`
    case 'month':
      return `${currentYear.value}年${currentMonth.value}月`
    case 'week':
      return `${currentYear.value}年 ${getMonthWeekLabel(currentYear.value, currentWeek.value)}`
  }
})

// 时间导航
const canGoPrev = computed(() => {
  switch (activeRange.value) {
    case 'year':
      return currentYear.value > 2020
    case 'month':
      return !(currentYear.value === 2020 && currentMonth.value === 1)
    case 'week':
      return currentWeek.value > 1 || currentYear.value > 2020
    default:
      return false
  }
})

// 缓存当前时间信息（每分钟更新一次即可，避免每次访问都创建 Date）
const nowInfo = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  week: getWeekNumber(new Date())
})

const canGoNext = computed(() => {
  const { year: nowYear, month: nowMonth, week: nowWeek } = nowInfo.value
  
  switch (activeRange.value) {
    case 'year':
      return currentYear.value < nowYear
    case 'month':
      return !(currentYear.value === nowYear && currentMonth.value === nowMonth)
    case 'week':
      return !(currentYear.value === nowYear && currentWeek.value >= nowWeek)
    default:
      return false
  }
})

const goPrev = () => {
  switch (activeRange.value) {
    case 'year':
      currentYear.value--
      break
    case 'month':
      if (currentMonth.value === 1) {
        currentMonth.value = 12
        currentYear.value--
      } else {
        currentMonth.value--
      }
      break
    case 'week':
      if (currentWeek.value === 1) {
        currentYear.value--
        currentWeek.value = 52
      } else {
        currentWeek.value--
      }
      break
  }
}

const goNext = () => {
  switch (activeRange.value) {
    case 'year':
      currentYear.value++
      break
    case 'month':
      if (currentMonth.value === 12) {
        currentMonth.value = 1
        currentYear.value++
      } else {
        currentMonth.value++
      }
      break
    case 'week':
      if (currentWeek.value >= 52) {
        currentWeek.value = 1
        currentYear.value++
      } else {
        currentWeek.value++
      }
      break
  }
}

// 从 API 获取统计数据
const fetchStats = async () => {
  isLoadingStats.value = true
  try {
    const range = activeRange.value
    const year = range !== 'all' ? currentYear.value : undefined
    const month = (range === 'month' || range === 'week') ? currentMonth.value : undefined
    const week = range === 'week' ? currentWeek.value : undefined
    statsData.value = await memoryStore.getStats(range, year, month, week)
  } catch (e) {
    logger.error('Failed to fetch stats', 'Stats', e)
  } finally {
    isLoadingStats.value = false
  }
}

// 选中的柱状图索引（-1 表示没有选中）
const selectedBarIndex = ref(-1)

// 切换柱状图选中状态
const toggleBarSelection = (index: number) => {
  if (selectedBarIndex.value === index) {
    selectedBarIndex.value = -1  // 再次点击取消选中
  } else {
    selectedBarIndex.value = index
  }
}

// 监听时间范围变化
watch([activeRange, currentYear, currentMonth, currentWeek], () => {
  selectedBarIndex.value = -1  // 重置选中状态
  fetchStats()
})

// 统计数据（从 API 获取）
const stats = computed(() => {
  if (!statsData.value) {
    return {
      totalMemories: 0,
      totalPhotos: 0,
      consecutiveDays: 0,
      periodCount: 0,
    }
  }
  return {
    totalMemories: statsData.value.totalMemories || 0,
    totalPhotos: statsData.value.totalPhotos || 0,
    consecutiveDays: statsData.value.consecutiveDays || 0,
    periodCount: statsData.value.periodCount || 0,
  }
})

// 统计卡片标签
const periodLabel = computed(() => {
  switch (activeRange.value) {
    case 'all': return '本月'
    case 'year': return '今年'
    case 'month': return '本月'
    case 'week': return '本周'
  }
})

const moodDistribution = computed(() => {
  if (!statsData.value?.moodDistribution) {
    return []
  }
  const distribution = statsData.value.moodDistribution
  const total = distribution.reduce((sum, item) => sum + item.count, 0)
  return distribution.map((item) => ({
    mood: item.mood,
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }))
})

// 趋势数据标题
const trendTitle = computed(() => {
  switch (activeRange.value) {
    case 'all':
      return '年度趋势'
    case 'year':
      return '月度趋势'
    case 'month':
      return '每周趋势'
    case 'week':
      return '每日趋势'
  }
})

// 默认趋势数据（避免在计算属性中重复创建数组）
const defaultTrendData: TrendItem[] = [
  { label: '1', count: 0 },
  { label: '2', count: 0 },
  { label: '3', count: 0 },
  { label: '4', count: 0 },
  { label: '5', count: 0 },
  { label: '6', count: 0 },
]

const trendData = computed((): TrendItem[] => {
  if (!statsData.value?.trend) {
    return defaultTrendData
  }
  return statsData.value.trend
})

// 使用 reduce 避免创建临时数组，提升性能
const maxTrendCount = computed(() => 
  trendData.value.reduce((max, d) => Math.max(max, d.count), 1)
)



onMounted(async () => {
  await fetchStats()
  // 使用 requestAnimationFrame 与浏览器渲染帧同步，避免掉帧
  requestAnimationFrame(() => {
    isLoaded.value = true
    // 动画完成后标记
    setTimeout(() => {
      hasAnimated.value = true
    }, 600)
  })
})

onActivated(() => {
  // 立即同步恢复滚动位置，避免页面先显示错误位置再跳转
  if (scrollY.value > 0) {
    window.scrollTo(0, scrollY.value)
  }
})

onDeactivated(() => {
  scrollY.value = window.scrollY
})
</script>

<template>
  <div class="page-container">
    <!-- 背景装饰光晕（使用 GPU 加速） -->
    <!-- 静态背景光晕，移除 will-change 避免不必要的 GPU 内存占用 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/4 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--glow-secondary);"
      />
      <div 
        class="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px] opacity-30"
        style="background: var(--glow-blue);"
      />
    </div>
    
    <!-- 主内容区域 -->
    <div class="relative max-w-lg mx-auto px-6">
      <!-- 头部 -->
      <header 
        class="pt-16 pb-6 safe-area-top"
        :class="{ 'animate-slide-up': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Your Insights</span>
            <div class="w-1 h-1 rounded-full bg-blue-500 opacity-60"></div>
          </div>
          <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">
            数据<span class="text-gradient">统计</span>
          </h1>
        </div>
      </header>
      
      <!-- 时间范围切换器 - 高级玻璃拟态 -->
      <section 
        class="mb-8"
        :class="{ 'animate-slide-up delay-50': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="p-1.5 rounded-[1.5rem] bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm"
        >
          <div class="relative flex">
            <!-- 滑动背景指示器 -->
            <div 
              class="absolute top-0 h-full rounded-[1.25rem] transition-all duration-500 ease-out"
              style="box-shadow: 0 4px 12px rgba(0,0,0,0.05);"
              :style="{
                width: `${100 / timeRanges.length}%`,
                left: `${(activeRangeIndex * 100) / timeRanges.length}%`,
                backgroundColor: 'var(--bg-elevated)'
              }"
            />
            
            <button
              v-for="range in timeRanges"
              :key="range.key"
              @click="activeRange = range.key"
              class="relative flex-1 py-3 text-center text-[11px] font-black tracking-widest uppercase transition-all duration-300 z-10"
              :style="{ color: activeRange === range.key ? 'black' : 'var(--text-tertiary)', opacity: activeRange === range.key ? '1' : '0.5' }"
            >
              {{ range.label }}
            </button>
          </div>
        </div>
        
        <!-- 时间导航 -->
        <div 
          v-if="activeRange !== 'all'"
          class="flex items-center justify-between mt-6 px-2"
        >
          <button 
            @click="goPrev"
            :disabled="!canGoPrev"
            class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 disabled:opacity-20 border border-black/5"
          >
            <ChevronLeft class="w-4 h-4 opacity-40" />
          </button>
          
          <div class="flex flex-col items-center">
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">{{ activeRange }}</span>
            <span class="text-sm font-bold tracking-tight mt-0.5" style="color: var(--text-primary);">{{ timeLabel }}</span>
          </div>
          
          <button 
            @click="goNext"
            :disabled="!canGoNext"
            class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 disabled:opacity-20 border border-black/5"
          >
            <ChevronRight class="w-4 h-4 opacity-40" />
          </button>
        </div>
      </section>
      
      <!-- 核心数据看板 -->
      <section
        class="mb-8"
        :class="{ 'animate-slide-up delay-100': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <SkeletonLoader v-if="isLoadingStats" type="stats" />

        <div
          v-else
          class="grid grid-cols-2 gap-4"
        >
          <!-- 左侧大卡片：记忆数 -->
          <div class="p-6 rounded-[2rem] bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/50 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-orange-400 rounded-full blur-[40px] opacity-20"></div>
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 text-orange-800">Total Memories</span>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="text-5xl font-black tracking-tighter text-orange-600">{{ stats.totalMemories }}</span>
              <span class="text-xs font-bold text-orange-600/50 uppercase">Entries</span>
            </div>
          </div>

          <!-- 右侧两个小卡片 -->
          <div class="flex flex-col gap-4">
            <div class="flex-1 p-5 rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm flex flex-col justify-center">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40">Current Streak</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-blue-600">{{ stats.consecutiveDays }}</span>
                <span class="text-[10px] font-bold text-blue-600/50 uppercase">Days</span>
              </div>
            </div>
            <div class="flex-1 p-5 rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm flex flex-col justify-center">
              <span class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40">Photos</span>
              <div class="mt-1 flex items-baseline gap-1">
                <span class="text-3xl font-black tracking-tighter text-purple-600">{{ stats.totalPhotos }}</span>
                <span class="text-[10px] font-bold text-purple-600/50 uppercase">Pics</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 情绪分布与趋势 - 高级排版 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-32">
        <!-- 情绪分布 -->
        <section 
          :class="{ 'animate-slide-up delay-200': isLoaded && !hasAnimated }"
          :style="{ opacity: isLoaded ? 1 : 0 }"
        >
          <div class="p-6 rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm">
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mb-6">Mood Distribution</h3>
            
            <div class="space-y-4">
              <div 
                v-for="item in moodDistribution" 
                :key="item.mood"
                class="flex items-center gap-4"
              >
                <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-xl shadow-sm">{{ MoodEmoji[item.mood as keyof typeof MoodEmoji] }}</div>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span class="opacity-60">{{ item.percentage }}%</span>
                    <span class="opacity-30">{{ item.count }}</span>
                  </div>
                  <div class="h-1.5 rounded-full overflow-hidden bg-black/5">
                    <div 
                      class="h-full rounded-full origin-left bg-gradient-accent"
                      style="transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1);"
                      :style="{ transform: `scaleX(${item.percentage / 100})` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 趋势图表 -->
        <section 
          :class="{ 'animate-slide-up delay-300': isLoaded && !hasAnimated }"
          :style="{ opacity: isLoaded ? 1 : 0 }"
        >
          <div class="p-6 rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm h-full flex flex-col">
            <h3 class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mb-6">Activity Trend</h3>
            
            <div class="flex-1 flex items-end justify-between gap-2 pt-8 relative">
              <div 
                v-for="(item, index) in trendData" 
                :key="item.label"
                class="flex-1 flex flex-col items-center cursor-pointer group h-full justify-end"
                @click="toggleBarSelection(index)"
              >
                <!-- 数值气泡 -->
                <div 
                  class="mb-2 px-2 py-1 rounded-lg bg-black text-white text-[9px] font-bold tracking-wider transition-all duration-300"
                  :class="selectedBarIndex === index && item.count > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'"
                >
                  {{ item.count }}
                </div>
                
                <!-- 柱状体 -->
                <div 
                  class="w-full rounded-t-xl transition-all duration-500"
                  :class="item.count > 0 ? '' : 'opacity-20'"
                  :style="{ 
                    background: selectedBarIndex === index ? 'var(--color-primary)' : 'var(--text-muted)',
                    height: item.count > 0 ? `${Math.max((item.count / maxTrendCount) * 100, 10)}%` : '4px',
                    opacity: selectedBarIndex === index ? '1' : (item.count > 0 ? '0.4' : '0.2')
                  }"
                ></div>
                
                <!-- 标签 -->
                <span class="text-[9px] font-bold tracking-widest uppercase mt-3 transition-colors duration-300"
                      :style="{ opacity: selectedBarIndex === index ? '1' : '0.4' }">
                  {{ item.label }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
