<script setup lang="ts">
import { computed, watch, ref, onBeforeUnmount } from 'vue'
import { useMemoryStore, useUserStore } from '@/stores'
import CalendarCell from './CalendarCell.vue'
import { useI18n } from 'vue-i18n'

const memoryStore = useMemoryStore()
const userStore = useUserStore()
const { t } = useI18n()

const allWeekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const isTransitioning = ref(false)

const weekDays = computed(() => {
  const start = userStore.settings.startOfWeek || 0
  return [...allWeekDays.slice(start), ...allWeekDays.slice(0, start)]
})

// 生成日历网格数据
const getCalendarGrid = computed(() => {
  const { year, month } = memoryStore.currentMonth
  const startOfWeek = userStore.settings.startOfWeek || 0
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const adjustedFirst = (firstDayOfMonth - startOfWeek + 7) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  
  const grid = []
  
  // 上个月的尾巴
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = adjustedFirst - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    grid.push({ date, day, isCurrentMonth: false })
  }
  
  // 本月数据
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
})

// 监听月份变化，触发过渡动画
let transitionTimer: ReturnType<typeof setTimeout> | null = null

watch(() => memoryStore.currentMonth, () => {
  if (transitionTimer) clearTimeout(transitionTimer)
  isTransitioning.value = true
  memoryStore.fetchCalendarData(memoryStore.currentMonth.year, memoryStore.currentMonth.month)
  transitionTimer = setTimeout(() => {
    isTransitioning.value = false
    transitionTimer = null
  }, 500)
}, { immediate: true })

onBeforeUnmount(() => {
  if (transitionTimer) clearTimeout(transitionTimer)
})
</script>

<template>
  <div class="calendar-grid-container p-2">
    <!-- 星期表头：紧凑 -->
    <div class="grid grid-cols-7 mb-3">
      <div 
        v-for="day in weekDays" 
        :key="day" 
        class="text-center text-[8px] font-black uppercase tracking-widest opacity-20"
        style="color: var(--text-primary);"
      >
        {{ t(`common.weekdays_short.${day}`) }}
      </div>
    </div>

    <!-- 日历网格：紧凑间距 -->
    <div 
      class="grid grid-cols-7 gap-y-1 relative transition-all duration-500"
      :class="{ 'opacity-40 scale-[0.99] blur-[2px]': isTransitioning }"
    >
      <CalendarCell
        v-for="item in getCalendarGrid"
        :key="item.date"
        :date="item.date"
        :day="item.day"
        :is-current-month="item.isCurrentMonth"
      />
    </div>
  </div>
</template>

<style scoped>
.calendar-grid-container {
  min-height: 380px;
}
</style>
