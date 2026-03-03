<script lang="ts">
export default {
  name: 'HomeView'
}
</script>

<script setup lang="ts">
import { onMounted, computed, ref, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore, useUserStore } from '@/stores'
import { ChevronRight, Camera, Heart, CalendarDays, ArrowRight, Sun, Moon, Sparkles } from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import FloatingAddButton from '@/components/layout/FloatingAddButton.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import PullToRefresh from '@/components/ui/PullToRefresh.vue'
import { useResponsive } from '@/composables/useResponsive'
import { logger } from '@/services/logger'
import type { Memory } from '@/types'

const router = useRouter()
const memoryStore = useMemoryStore()
const userStore = useUserStore()

// 下拉刷新
const pullToRefreshRef = ref<InstanceType<typeof PullToRefresh> | null>(null)

const handleRefresh = async () => {
  const { year, month } = memoryStore.currentMonth
  await Promise.all([
    memoryStore.fetchCalendarData(year, month),
    memoryStore.fetchRecentMemories(5),
  ])
  try {
    flashbackData.value = await memoryStore.getFlashback()
  } catch (e) {
    // ignore
  }
  pullToRefreshRef.value?.complete()
}

// 响应式布局
const { isMobile, isTablet, isDesktop, width } = useResponsive()

// 根据屏幕大小计算卡片高度
const cardHeight = computed(() => {
  if (isDesktop.value) return '450px'
  if (isTablet.value) return '420px'
  return '400px'
})

// 轮播卡片宽度
const carouselCardWidth = computed(() => {
  if (isDesktop.value) return 'calc(50% - 1.5rem)'
  if (isTablet.value) return 'calc(70% - 1.5rem)'
  return 'calc(100% - 3rem)'
})

// 滚动位置保存
const scrollY = ref(0)
const carouselScrollX = ref(-1) // -1 表示尚未初始化

// 轮播容器引用
const carouselRef = ref<HTMLElement | null>(null)

// 时间问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const greetingIcon = computed(() => {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? Sun : Moon
})

// 从 store 获取最近记忆
const recentMemories = computed<Memory[]>(() => {
  return memoryStore.recentMemories
})

const currentDate = computed(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[now.getDay()]}`
})

// 一年前的记忆（从 flashback API 获取）
const flashbackData = ref<{ yearAgo: Memory | null; random: Memory[] }>({ yearAgo: null, random: [] })

const oneYearAgoMemory = computed<Memory | null>(() => {
  return flashbackData.value.yearAgo
})

// 精选记忆列表（用于轮播）
const featuredMemories = computed(() => {
  const memories: Array<{ type: 'anniversary' | 'recommended', memory: Memory, label: string }> = []
  
  if (oneYearAgoMemory.value) {
    memories.push({
      type: 'anniversary',
      memory: oneYearAgoMemory.value,
      label: '一年前的今天'
    })
  }
  
  recentMemories.value.forEach(memory => {
    memories.push({
      type: 'recommended',
      memory,
      label: '回忆推荐'
    })
  })
  
  return memories
})

// 扩展的记忆列表
const extendedMemories = computed(() => {
  if (featuredMemories.value.length === 0) return []
  return [
    ...featuredMemories.value,
    ...featuredMemories.value,
    ...featuredMemories.value
  ]
})

const goToCalendar = () => {
  router.push({ name: 'calendar' })
}

const goToStats = () => {
  router.push({ name: 'stats' })
}

// 控制卡片动画
const isLoaded = ref(false)
// 标记是否已经播放过入场动画（区分首次加载和 KeepAlive 恢复）
const hasAnimated = ref(false)

onMounted(async () => {
  const { year, month } = memoryStore.currentMonth
  memoryStore.fetchCalendarData(year, month)
  
  await memoryStore.fetchRecentMemories(5)
  
  try {
    flashbackData.value = await memoryStore.getFlashback()
  } catch (e) {
    logger.warn('Failed to fetch flashback', 'Home', e)
  }
  
  setTimeout(() => {
    isLoaded.value = true
    // 动画完成后标记
    setTimeout(() => {
      hasAnimated.value = true
    }, 600) // 等待最长的动画完成
  }, 100)
})

// KeepAlive 激活时恢复位置
onActivated(() => {
  // 如果需要恢复非零滚动位置，使用同步方式立即恢复
  // 这样可以避免页面先显示错误位置再跳转
  if (scrollY.value > 0) {
    // 立即设置滚动位置（同步操作）
    window.scrollTo(0, scrollY.value)
  }
  
  // 恢复轮播位置
  if (carouselRef.value) {
    if (carouselScrollX.value === -1) {
      // 第一次进入，初始化到中间
      requestAnimationFrame(() => {
        if (carouselRef.value) {
          const containerWidth = carouselRef.value.scrollWidth
          const viewportWidth = carouselRef.value.clientWidth
          carouselRef.value.scrollLeft = (containerWidth - viewportWidth) / 2
        }
      })
    } else {
      // 恢复之前的滚动位置
      carouselRef.value.scrollLeft = carouselScrollX.value
    }
  }
})

// KeepAlive 离开时保存位置
onDeactivated(() => {
  scrollY.value = window.scrollY
  if (carouselRef.value) {
    carouselScrollX.value = carouselRef.value.scrollLeft
  }
})
</script>

<template>
  <PullToRefresh ref="pullToRefreshRef" @refresh="handleRefresh">
    <div class="page-container">
      <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/4 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--glow-secondary);"
      />
      <div 
        class="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full blur-[80px] opacity-30"
        style="background: var(--glow-blue);"
      />
    </div>
    
    <!-- 主内容区域 -->
    <div class="relative max-w-lg mx-auto px-5">
      <!-- 顶部欢迎区域 -->
      <header 
        class="pt-12 pb-6 safe-area-top"
        :class="{ 'animate-slide-up': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold tracking-[0.2em] uppercase opacity-50" style="color: var(--text-tertiary);">
              {{ currentDate }}
            </span>
            <div class="w-1 h-1 rounded-full opacity-30" style="background: var(--text-tertiary);"></div>
            <component 
              :is="greetingIcon" 
              class="w-3.5 h-3.5 opacity-60" 
              style="color: var(--color-primary);"
            />
          </div>
          <h1 class="text-3xl font-bold tracking-tight mt-1" style="color: var(--text-primary);">
            {{ greeting }}，<span class="text-gradient">{{ userStore.displayName }}</span>
          </h1>
          <p class="text-sm font-medium mt-1 opacity-60" style="color: var(--text-secondary);">
            今天有什么值得纪念的瞬间吗？ ✨
          </p>
        </div>
      </header>
      
      <!-- 本月数据概览 - 高级玻璃拟态 -->
      <section
        class="mb-10"
        :class="{ 'animate-slide-up delay-100': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div
          class="relative overflow-hidden p-6 rounded-[2rem] card-static shadow-xl group"
        >
          <!-- 内部装饰光 -->
          <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-[0.08] group-hover:opacity-20 transition-opacity duration-700" style="background-color: var(--color-primary);"></div>
          
          <div class="relative flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[11px] font-black tracking-widest uppercase opacity-40 mb-1" style="color: var(--text-primary);">本月记录</span>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ memoryStore.memoriesThisMonth }}</span>
                <span class="text-sm font-bold opacity-40" style="color: var(--text-primary);">条记忆</span>
              </div>
            </div>

            <div class="flex items-center gap-6">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                  <Camera class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
                </div>
                <span class="text-[10px] font-black opacity-30" style="color: var(--text-primary);">12 张</span>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center mb-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm">
                  <span class="text-xl">😊</span>
                </div>
                <span class="text-[10px] font-black opacity-30" style="color: var(--text-primary);">开心</span>
              </div>
            </div>
          </div>
          
          <!-- 底部动作条 -->
          <div class="mt-5 pt-4 border-t border-black/[0.03] dark:border-white/[0.03] flex justify-between items-center">
            <div class="flex -space-x-2">
              <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white/50 dark:border-white/10 overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div class="w-full h-full animate-shimmer"></div>
              </div>
            </div>
            <button
              @click="goToStats"
              class="text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all"
              style="color: var(--text-primary);"
            >
              Trends <ChevronRight class="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>
      
      <!-- 精选记忆轮播 - 极简标题 -->
      <section 
        class="mb-10"
        :class="{ 'animate-slide-up delay-200': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center gap-2 mb-4">
          <Sparkles class="w-4 h-4 opacity-40" />
          <h2 class="text-xs font-bold tracking-[0.2em] uppercase opacity-40" style="color: var(--text-tertiary);">时光回顾</h2>
        </div>
        
        <!-- 可滑动卡片容器 - 隐藏滚动条，增加弹性 -->
        <div class="relative -mx-5">
          <div 
            ref="carouselRef"
            class="flex gap-4 overflow-x-auto pb-6 px-5 snap-x snap-mandatory hide-scrollbar"
          >
            <!-- 无记忆时的占位 - 优雅的空状态 -->
            <div v-if="featuredMemories.length === 0" class="w-full snap-center">
              <div 
                class="relative h-48 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed border-black/5 opacity-40 group hover:opacity-60 transition-opacity"
              >
                <Heart class="w-8 h-8 mb-2" />
                <span class="text-sm font-medium">还没有精选回忆，去记录一条吧</span>
              </div>
            </div>

            <!-- 真实的卡片 -->
            <div
              v-for="(item, idx) in extendedMemories"
              :key="`${item.memory.id}-${idx}`"
              class="flex-shrink-0 snap-center"
              :style="{ width: carouselCardWidth }"
            >
              <div class="h-[320px] shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <FlipCard :memory="item.memory" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 最近记忆 - 错落网格布局 -->
      <section 
        class="pb-12"
        :class="{ 'animate-slide-up delay-400': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center justify-between mb-6">
          <div class="flex flex-col">
            <h2 class="text-2xl font-bold tracking-tight" style="color: var(--text-primary);">最近记忆</h2>
            <div class="w-8 h-1 rounded-full mt-1 bg-gradient-to-r from-orange-400 to-transparent opacity-40"></div>
          </div>
          <button 
            @click="goToCalendar"
            class="group flex items-center gap-2 py-2 px-4 rounded-full bg-white/50 backdrop-blur-md border border-white/40 text-sm font-bold transition-all hover:bg-white"
          >
            <span>全部</span>
            <ArrowRight class="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
        
        <!-- 记忆卡片列表 - 瀑布流/错落布局 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            v-for="(memory, index) in recentMemories"
            :key="memory.id"
            class="relative transition-all duration-700"
            :style="{ 
              opacity: isLoaded ? 1 : 0, 
              transform: isLoaded ? 'translateY(0)' : 'translateY(40px)',
              transitionDelay: `${0.3 + index * 0.15}s`
            }"
          >
            <!-- 为偶数项添加垂直偏移量，营造错落感 -->
            <div :class="{ 'md:mt-12': index % 2 !== 0 }">
              <div class="shadow-xl rounded-[2.5rem] overflow-hidden">
                <FlipCard :memory="memory" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    <!-- 悬浮添加按钮 -->
    <FloatingAddButton />
  </div>
  </PullToRefresh>
</template>
