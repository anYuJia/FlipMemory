<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMemoryStore } from '@/stores'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-vue-next'
import CalendarGrid from '@/components/calendar/CalendarGrid.vue'
import { useI18n } from 'vue-i18n'

const memoryStore = useMemoryStore()
const { t, locale } = useI18n()

const isLoaded = ref(false)

const currentMonthStr = computed(() => {
  const date = new Date(memoryStore.currentMonth.year, memoryStore.currentMonth.month - 1)
  return date.toLocaleDateString(locale.value, { month: 'long' })
})

const currentYear = computed(() => memoryStore.currentMonth.year)

const prevMonth = () => {
  memoryStore.prevMonth()
}

const nextMonth = () => {
  memoryStore.nextMonth()
}

const goToToday = () => {
  const now = new Date()
  memoryStore.setCurrentMonth(now.getFullYear(), now.getMonth() + 1)
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container page-enter pb-32">
    <!-- 动态氛围光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
      <div class="absolute -top-[10%] -left-[10%] w-[70%] h-[50%] rounded-full blur-[120px]" 
        :style="{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }"></div>
    </div>

    <div class="relative max-w-lg mx-auto px-7">
      <!-- 顶部导航：穿梭机感 (紧凑) -->
      <header class="pt-12 pb-6 safe-area-top">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <CalendarIcon class="w-3.5 h-3.5 opacity-30" />
            <span class="text-[9px] font-extrabold tracking-[0.2em] uppercase opacity-30">{{ t('nav.calendar') }}</span>
          </div>
          
          <div class="flex items-end justify-between mt-1">
            <div class="flex flex-col">
              <span class="text-[10px] font-black tracking-[0.1em] opacity-30">{{ currentYear }}</span>
              <div class="flex items-center gap-3 group cursor-pointer" @click="goToToday">
                <h1 class="text-4xl font-serif italic tracking-tighter transition-all duration-700 group-active:scale-95 group-active:opacity-60" style="color: var(--text-primary);">
                  {{ currentMonthStr }}
                </h1>
                <div class="w-1.5 h-1.5 rounded-full bg-gradient-accent animate-pulse"></div>
              </div>
            </div>

            <!-- 月份切换胶囊：缩小尺寸 -->
            <div class="flex items-center p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 backdrop-blur-xl">
              <button @click="prevMonth" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-active">
                <ChevronLeft class="w-4 h-4 opacity-40" />
              </button>
              <div class="w-px h-3 bg-black/[0.05] dark:bg-white/[0.1] mx-1"></div>
              <button @click="nextMonth" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-active">
                <ChevronRight class="w-4 h-4 opacity-40" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- 日历主容器 -->
      <section class="mb-6 transition-all duration-1000" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)' }">
        <div class="p-1 rounded-[2.2rem] card-static grainy-overlay shadow-lg relative overflow-hidden">
          <CalendarGrid />
        </div>
      </section>

      <!-- 底部提示：紧凑 -->
      <div class="flex flex-col items-center gap-3 opacity-30 mt-8 transition-all duration-1000 delay-500" :style="{ opacity: isLoaded ? 0.3 : 0 }">
        <Sparkles class="w-4 h-4" />
        <p class="text-[8px] font-black uppercase tracking-[0.3em] text-center px-10 leading-relaxed">
          Recorded in the flow of time.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
