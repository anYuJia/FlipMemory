<script lang="ts">
export default {
  name: 'CalendarView'
}
</script>

<script setup lang="ts">
import { ref, onMounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import CalendarGrid from '@/components/calendar/CalendarGrid.vue'
import FloatingAddButton from '@/components/layout/FloatingAddButton.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const memoryStore = useMemoryStore()
const { t } = useI18n()

const isLoaded = ref(true)
const hasAnimated = ref(false)
const scrollY = ref(0)

onMounted(async () => {
  if (memoryStore.currentMonthDays.length === 0) {
    const { year, month } = memoryStore.currentMonth
    await memoryStore.fetchCalendarData(year, month)
  }
  hasAnimated.value = true
})

onActivated(() => { if (scrollY.value > 0) window.scrollTo(0, scrollY.value) })
onDeactivated(() => { scrollY.value = window.scrollY })

const goToSearch = () => router.push({ name: 'search' })
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.04]" style="background-color: var(--glow-primary);" />
    </div>
    
    <!-- 主内容区域 -->
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('nav.calendar') }}</span>
              <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
            </div>
            <button @click="goToSearch" class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm active:scale-90">
              <Search class="w-4 h-4 opacity-40" style="color: var(--text-primary);" />
            </button>
          </div>
          
          <div class="flex items-end justify-between mt-2">
            <div>
              <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('calendar.title') }}</h1>
              <p class="text-sm font-medium mt-1 opacity-40" style="color: var(--text-primary);">{{ $t('calendar.subtitle') }}</p>
            </div>
            
            <div class="flex flex-col items-end">
              <span class="text-3xl font-black tracking-tighter text-gradient leading-none">{{ memoryStore.currentMonth.month }}</span>
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 mt-1" style="color: var(--text-primary);">{{ memoryStore.currentMonth.year }}</span>
            </div>
          </div>
        </div>
      </header>
      
      <section class="mb-8 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="p-6 rounded-[2.5rem] card-static shadow-2xl relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-[0.08] bg-orange-400"></div>
          <CalendarGrid />
        </div>
      </section>
    </div>
    
    <FloatingAddButton />
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
</style>
