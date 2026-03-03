<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useMemoryStore } from '@/stores'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import CalendarCell from './CalendarCell.vue'
import { useI18n } from 'vue-i18n'

const memoryStore = useMemoryStore()
const { t } = useI18n()

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const isCurrentRealMonth = computed(() => {
  const now = new Date()
  return memoryStore.currentMonth.year === now.getFullYear() && 
         memoryStore.currentMonth.month === now.getMonth() + 1
})

const getCalendarGrid = () => {
  const { year, month } = memoryStore.currentMonth
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  
  const grid = []
  
  // 上个月的尾巴
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const date = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    grid.push({ date, day, isCurrentMonth: false })
  }
  
  // 本月
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    grid.push({ date, day: i, isCurrentMonth: true })
  }
  
  // 下个月的头
  const remaining = 42 - grid.length
  for (let i = 1; i <= remaining; i++) {
    const date = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    grid.push({ date, day: i, isCurrentMonth: false })
  }
  
  return grid
}

const goToToday = () => {
  const now = new Date()
  memoryStore.setCurrentMonth(now.getFullYear(), now.getMonth() + 1)
}

onMounted(async () => {
  const { year, month } = memoryStore.currentMonth
  await memoryStore.fetchCalendarData(year, month)
})

watch(() => memoryStore.currentMonth, async (newMonth) => {
  await memoryStore.fetchCalendarData(newMonth.year, newMonth.month)
}, { deep: true })
</script>

<template>
  <div class="calendar">
    <!-- 月份导航 -->
    <div class="flex items-center justify-between mb-8">
      <button 
        @click="memoryStore.prevMonth()"
        class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 border border-black/5 dark:border-white/5 shadow-sm"
      >
        <ChevronLeft class="w-4 h-4 opacity-30" style="color: var(--text-primary);" />
      </button>
      
      <div class="flex flex-col items-center gap-1">
        <h2 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">
          {{ memoryStore.currentMonth.month }}月
        </h2>
        
        <button 
          v-if="!isCurrentRealMonth"
          @click="goToToday"
          class="text-[9px] font-black tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity"
          style="color: var(--text-primary);"
        >
          {{ $t('calendar.back_to_today') }}
        </button>
      </div>
      
      <button 
        @click="memoryStore.nextMonth()"
        class="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 border border-black/5 dark:border-white/5 shadow-sm"
      >
        <ChevronRight class="w-4 h-4 opacity-30" style="color: var(--text-primary);" />
      </button>
    </div>
    
    <!-- 星期标题 -->
    <div class="grid grid-cols-7 mb-4">
      <div 
        v-for="day in weekDays" 
        :key="day"
        class="text-center text-[10px] font-black py-2 tracking-[0.2em] uppercase opacity-20"
        style="color: var(--text-primary);"
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
