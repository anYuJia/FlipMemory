<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { MoodEmoji, type MoodType } from '@/types/memory'

const props = defineProps<{
  date: string
  day: number
  isCurrentMonth: boolean
}>()

const router = useRouter()
const memoryStore = useMemoryStore()

const calendarDay = computed(() => memoryStore.calendarDays.get(props.date))
const hasMemory = computed(() => !!calendarDay.value?.hasMemory)
const mood = computed(() => calendarDay.value?.mood)

const isToday = computed(() => {
  const today = new Date()
  const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return props.date === d
})

const isSelected = computed(() => memoryStore.currentDate === props.date)

const handleClick = () => {
  memoryStore.setCurrentDate(props.date)
  router.push({ name: 'memory-detail', params: { date: props.date } })
}
</script>

<template>
  <div
    v-memo="[date, hasMemory, mood, isToday, isSelected]"
    class="relative aspect-square flex flex-col items-center justify-center cursor-pointer group rounded-[1.25rem] outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-1"
    role="gridcell"
    tabindex="0"
    :aria-label="`${date}, ${hasMemory ? 'has memory' : 'no memory'}`"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- 选中态底色 -->
    <div 
      class="absolute inset-1 rounded-[1.25rem] transition-all duration-500"
      :class="isSelected ? 'bg-black dark:bg-white scale-100 opacity-100 shadow-lg' : 'scale-75 opacity-0'"
    />

    <!-- 内容层 -->
    <div class="relative z-10 flex flex-col items-center justify-center gap-0.5">
      <!-- 心情表情：有记忆时显示 -->
      <span v-if="hasMemory && mood" class="text-xs transform scale-90 -mb-0.5 drop-shadow-sm">
        {{ MoodEmoji[mood as MoodType] }}
      </span>
      
      <!-- 数字 -->
      <span 
        class="text-xs font-black tracking-tighter transition-colors duration-300"
        :style="{ 
          color: isSelected
            ? 'var(--bg-primary)'
            : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
          opacity: isCurrentMonth ? 1 : 0.25
        }"
      >
        {{ day }}
      </span>
    </div>

    <!-- 今日标记：极简外环 -->
    <div 
      v-if="isToday && !isSelected"
      class="absolute inset-1.5 rounded-[1.1rem] border-2 border-orange-400/20"
    />
    
    <!-- 悬浮反馈 -->
    <div class="absolute inset-1.5 rounded-[1.1rem] bg-black/[0.02] dark:bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
</template>

<style scoped>
</style>
