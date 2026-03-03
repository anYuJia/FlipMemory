<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { MoodEmoji } from '@/types/memory'

interface Props {
  date: string
  day: number
  isCurrentMonth: boolean
}

const props = defineProps<Props>()
const router = useRouter()
const memoryStore = useMemoryStore()

const calendarDay = computed(() => {
  return memoryStore.calendarDays.get(props.date)
})

const hasMemory = computed(() => calendarDay.value?.hasMemory || false)

const isToday = computed(() => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return props.date === todayStr
})

const isSelected = computed(() => {
  return props.date === memoryStore.currentDate
})

const isWeekend = computed(() => {
  const date = new Date(props.date)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
})

const moodEmoji = computed(() => {
  const mood = calendarDay.value?.mood
  if (!mood) return null
  return MoodEmoji[mood]
})

const handleClick = () => {
  if (!props.isCurrentMonth) return
  
  memoryStore.setCurrentDate(props.date)
  
  if (hasMemory.value) {
    router.push(`/memory/${props.date}`)
  } else {
    router.push({ name: 'create-memory', query: { date: props.date } })
  }
}
</script>

<template>
  <div 
    class="calendar-cell"
    :class="{
      'is-other-month': !isCurrentMonth,
      'has-memory': hasMemory && isCurrentMonth,
      'is-today': isToday && isCurrentMonth,
      'is-selected': isSelected && isCurrentMonth,
      'is-weekend': isWeekend && isCurrentMonth,
    }"
    @click="handleClick"
  >
    <!-- 今日光环效果 -->
    <div v-if="isToday && isCurrentMonth && !isSelected" class="today-glow" />
    
    <!-- 选中状态背景 -->
    <div v-if="isSelected && isCurrentMonth" class="selected-bg" />
    
    <!-- 日期数字 -->
    <span class="day-number">{{ day }}</span>
    
    <!-- 心情指示器 -->
    <div v-if="hasMemory && isCurrentMonth && !isSelected" class="mood-indicator">
      <span v-if="moodEmoji" class="emoji">{{ moodEmoji }}</span>
      <span v-else class="dot" />
    </div>
    
    <!-- 选中状态的心情 -->
    <div v-if="isSelected && hasMemory && moodEmoji" class="selected-mood">
      {{ moodEmoji }}
    </div>
  </div>
</template>

<style scoped>
.calendar-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  background: transparent;
  overflow: hidden;
}

.calendar-cell:hover:not(.is-other-month) {
  background: var(--bg-tertiary);
  transform: scale(1.05);
}

.calendar-cell:active:not(.is-other-month) {
  transform: scale(0.95);
}

.calendar-cell.is-other-month {
  opacity: 0.25;
  cursor: default;
}

.calendar-cell.has-memory {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
}

.calendar-cell.has-memory:hover {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
}

/* 今日样式 - 发光边框 */
.calendar-cell.is-today {
  position: relative;
}

.today-glow {
  position: absolute;
  inset: 2px;
  border-radius: 0.875rem;
  border: 2px solid var(--color-primary);
  box-shadow: 
    inset 0 0 8px rgba(255, 140, 66, 0.2),
    0 0 12px rgba(255, 140, 66, 0.15);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { 
    opacity: 1;
    box-shadow: 
      inset 0 0 8px rgba(255, 140, 66, 0.2),
      0 0 12px rgba(255, 140, 66, 0.15);
  }
  50% { 
    opacity: 0.7;
    box-shadow: 
      inset 0 0 12px rgba(255, 140, 66, 0.3),
      0 0 20px rgba(255, 140, 66, 0.25);
  }
}

/* 选中状态 */
.calendar-cell.is-selected {
  transform: scale(1.08);
}

.calendar-cell.is-selected:hover {
  transform: scale(1.1);
}

.selected-bg {
  position: absolute;
  inset: 0;
  background: var(--gradient-accent);
  border-radius: inherit;
  box-shadow: 
    0 4px 12px rgba(255, 140, 66, 0.3),
    0 8px 24px rgba(255, 107, 107, 0.2);
}

/* 日期数字 */
.day-number {
  position: relative;
  z-index: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}

.calendar-cell.is-weekend .day-number {
  color: var(--color-accent);
}

.calendar-cell.is-other-month .day-number {
  color: var(--text-muted);
}

.calendar-cell.is-selected .day-number {
  color: white;
  font-weight: 700;
}

/* 心情指示器 */
.mood-indicator {
  position: relative;
  z-index: 1;
  margin-top: 3px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-indicator .emoji {
  font-size: 1.275rem;
  line-height: 1;
}

.mood-indicator .dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: var(--gradient-accent);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(255, 140, 66, 0.4);
}

.selected-mood {
  position: absolute;
  bottom: 3px;
  font-size: 0.75rem;
  opacity: 0.95;
}

/* 周末样式 */
.calendar-cell.is-weekend:not(.is-other-month):not(.is-selected) {
  background: rgba(147, 112, 219, 0.05);
}
</style>
