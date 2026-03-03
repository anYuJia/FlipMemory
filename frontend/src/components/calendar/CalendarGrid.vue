<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useMemoryStore } from '@/stores'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import CalendarCell from './CalendarCell.vue'

const memoryStore = useMemoryStore()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 格式化当前月份显示
const currentMonthDisplay = computed(() => {
  const { year, month } = memoryStore.currentMonth
  return `${year}年${month}月`
})

// 判断是否是当前月
const isCurrentRealMonth = computed(() => {
  const now = new Date()
  return memoryStore.currentMonth.year === now.getFullYear() && 
         memoryStore.currentMonth.month === now.getMonth() + 1
})

// 生成日历网格
const getCalendarGrid = () => {
  const { year, month } = memoryStore.currentMonth
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  
  const grid: Array<{ date: string; isCurrentMonth: boolean; day: number }> = []
  
  // 上个月
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    grid.push({
      date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isCurrentMonth: false,
      day,
    })
  }
  
  // 当前月
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isCurrentMonth: true,
      day,
    })
  }
  
  // 下个月
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const remainingDays = 7 - (grid.length % 7)
  
  if (remainingDays < 7) {
    for (let day = 1; day <= remainingDays; day++) {
      grid.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        day,
      })
    }
  }
  
  return grid
}

const goToToday = () => {
  const now = new Date()
  memoryStore.setCurrentMonth(now.getFullYear(), now.getMonth() + 1)
}

watch(
  () => memoryStore.currentMonth,
  ({ year, month }) => {
    memoryStore.fetchCalendarData(year, month)
  },
  { immediate: true }
)

onMounted(() => {
  const { year, month } = memoryStore.currentMonth
  memoryStore.fetchCalendarData(year, month)
})
</script>

<template>
  <div class="calendar">
    <!-- 月份导航 -->
    <div class="flex items-center justify-between mb-8">
      <button 
        @click="memoryStore.prevMonth()"
        class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 active:scale-90 border border-black/5"
      >
        <ChevronLeft class="w-4 h-4 opacity-30" />
      </button>
      
      <div class="flex flex-col items-center gap-1">
        <h2 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">
          {{ memoryStore.currentMonth.month }}月
        </h2>
        
        <!-- 返回今天按钮 -->
        <button 
          v-if="!isCurrentRealMonth"
          @click="goToToday"
          class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity"
        >
          Back to Today
        </button>
      </div>
      
      <button 
        @click="memoryStore.nextMonth()"
        class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 active:scale-90 border border-black/5"
      >
        <ChevronRight class="w-4 h-4 opacity-30" />
      </button>
    </div>
    
    <!-- 星期标题 -->
    <div class="grid grid-cols-7 mb-4">
      <div 
        v-for="(day, index) in weekDays" 
        :key="day"
        class="text-center text-[10px] font-black py-2 tracking-[0.2em] uppercase opacity-20"
      >
        {{ day }}
      </div>
    </div>
    
    <!-- 日历网格 -->
    <div class="grid grid-cols-7 gap-3">
      <CalendarCell
        v-for="item in getCalendarGrid()"
        :key="item.date"
        :date="item.date"
        :day="item.day"
        :is-current-month="item.isCurrentMonth"
      />
    </div>
  </div>
</template>
