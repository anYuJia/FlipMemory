<script lang="ts">
export default {
  name: 'CalendarView'
}
</script>

<script setup lang="ts">
import { ref, onMounted, computed, onActivated, onDeactivated } from 'vue'
import { Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import CalendarGrid from '@/components/calendar/CalendarGrid.vue'
import FloatingAddButton from '@/components/layout/FloatingAddButton.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { useMemoryStore } from '@/stores'

const router = useRouter()
const memoryStore = useMemoryStore()
const isLoaded = ref(false)
const hasAnimated = ref(false) // 标记是否已播放过入场动画
const scrollY = ref(0)

// 格式化当前月份显示（用于木板吊牌）
const currentMonthDisplay = computed(() => {
  const { year, month } = memoryStore.currentMonth
  return `${year}年${month}月`
})

const goToSearch = () => {
  router.push({ name: 'search' })
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
    // 动画完成后标记
    setTimeout(() => {
      hasAnimated.value = true
    }, 600)
  }, 100)
})

onActivated(() => {
  // 立即同步恢复滚动位置
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
      <!-- 头部 -->
      <header 
        class="pt-16 pb-8 safe-area-top"
        :class="{ 'animate-slide-up': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Timeline Calendar</span>
              <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
            </div>
            
            <!-- 搜索按钮 -->
            <button 
              @click="goToSearch"
              class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 bg-white/40 backdrop-blur-md border border-white/40 shadow-sm"
            >
              <Search class="w-4 h-4 opacity-40" />
            </button>
          </div>
          
          <div class="flex items-end justify-between mt-2">
            <div>
              <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">
                记忆<span class="text-gradient">日历</span>
              </h1>
              <p class="text-sm font-medium mt-1 opacity-50">
                在时光中寻找珍贵的回忆 ✨
              </p>
            </div>
            
            <!-- 高级月份显示 -->
            <div class="flex flex-col items-end">
              <span class="text-3xl font-black tracking-tighter text-gradient leading-none">{{ memoryStore.currentMonth.month }}</span>
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mt-1">{{ memoryStore.currentMonth.year }}</span>
            </div>
          </div>
        </div>
      </header>
      
      <!-- 日历卡片 - 深度玻璃拟态 -->
      <section
        class="mb-8"
        :class="{ 'animate-slide-up delay-100': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div
          class="p-6 rounded-[2.5rem] card-static shadow-2xl relative overflow-hidden"
        >
          <!-- 装饰光晕 -->
          <div class="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-10 bg-orange-400"></div>
          <CalendarGrid />
        </div>
      </section>
      
      <!-- 提示信息 -->
      <div 
        class="text-center pb-24"
        :class="{ 'animate-fade-in delay-300': isLoaded && !hasAnimated }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
          style="background: var(--card-bg); border: 1px solid var(--card-border);"
        >
          <div class="flex items-center gap-2 text-sm" style="color: var(--text-tertiary);">
            <span class="w-2 h-2 rounded-full" style="background: var(--color-primary);"></span>
            <span>点击日期添加或查看记忆</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 悬浮添加按钮 -->
    <FloatingAddButton />
  </div>
</template>
