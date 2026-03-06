<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { Shuffle, Clock, Sparkles, Film } from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import { useMemoryStore } from '@/stores'
import type { Memory } from '@/types'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const memoryStore = useMemoryStore()

const yearAgoMemory = ref<Memory | null>(null)
const randomMemories = ref<Memory[]>([])
const currentIndex = ref(0)
const isLoading = ref(false)
const isLoaded = ref(false)

const allFlashbacks = computed(() => {
  const list = []
  if (yearAgoMemory.value) list.push(yearAgoMemory.value)
  if (randomMemories.value?.length) list.push(...randomMemories.value)
  return list
})

const currentMemory = computed(() => allFlashbacks.value[currentIndex.value] || null)
const hasMultiple = computed(() => allFlashbacks.value.length > 1)

const currentLabel = computed(() => {
  if (yearAgoMemory.value && currentIndex.value === 0) return t('flashback.one_year_ago')
  return t('flashback.random_memory')
})

async function loadFlashback() {
  isLoading.value = true
  isLoaded.value = false
  try {
    const data = await memoryStore.getFlashback()
    if (data) {
      yearAgoMemory.value = data.yearAgo
      randomMemories.value = data.random || []
      currentIndex.value = 0
    }
  } finally {
    isLoading.value = false
    setTimeout(() => { isLoaded.value = true }, 300)
  }
}

function nextMemory() {
  if (allFlashbacks.value.length <= 1) return
  isLoaded.value = false
  setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % allFlashbacks.value.length
    setTimeout(() => { isLoaded.value = true }, 50)
  }, 400)
}

onMounted(() => {
  loadFlashback()
})

onActivated(() => {
  if (!allFlashbacks.value.length && !isLoading.value) {
    loadFlashback()
  }
})
</script>

<template>
  <div class="page-container page-enter pb-32 overflow-hidden bg-primary">
    <div class="fixed inset-0 pointer-events-none transition-all duration-[2s]">
      <div class="absolute -top-[20%] -right-[10%] w-[80%] h-[60%] rounded-full blur-[150px] opacity-20 animate-pulse-slow" 
        :style="{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }"></div>
      <div class="absolute bottom-[10%] -left-[20%] w-[70%] h-[50%] rounded-full blur-[130px] opacity-15" 
        :style="{ background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)` }"></div>
    </div>

    <div class="relative max-w-lg mx-auto px-7">
      <header class="pt-12 pb-8 safe-area-top">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-3">
            <Film class="w-3.5 h-3.5 opacity-30" />
            <span class="text-[9px] font-extrabold tracking-[0.2em] uppercase opacity-30">{{ t('nav.flashback') }}</span>
          </div>
          <h1 class="text-4xl font-serif italic tracking-tighter mt-1 leading-tight" style="color: var(--text-primary);">
            {{ t('flashback.title') || 'Cinema of Time' }}
          </h1>
        </div>
      </header>

      <section class="mb-10 relative min-h-[480px]">
        <!-- 装饰性胶片孔 -->
        <div class="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-5">
          <div v-for="i in 8" :key="i" class="w-1.5 h-1.5 rounded-sm bg-current"></div>
        </div>
        <div class="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-5">
          <div v-for="i in 8" :key="i" class="w-1.5 h-1.5 rounded-sm bg-current"></div>
        </div>

        <div 
          v-if="!isLoading && currentMemory"
          class="transition-all duration-700 ease-spring" 
          :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(15px)' }"
        >
          <div class="h-[480px] shadow-premium rounded-[2.5rem] overflow-hidden relative group border border-black/5 dark:border-white/5">
            <div class="absolute top-5 left-5 z-20 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 flex items-center gap-2">
              <Sparkles class="w-3 h-3 text-orange-400" />
              <span class="text-[8px] font-black text-white uppercase tracking-widest">{{ currentLabel }}</span>
            </div>
            <FlipCard :memory="currentMemory" />
          </div>
        </div>

        <div v-else-if="isLoading" class="h-[480px] flex items-center justify-center card-static rounded-[2.5rem]">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-orange-400/10 border-t-orange-400 rounded-full animate-spin"></div>
            <p class="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">{{ t('flashback.developing') }}</p>
          </div>
        </div>

        <div v-else class="h-[480px] flex flex-col items-center justify-center card-static rounded-[2.5rem] border-dashed opacity-40">
          <Clock class="w-14 h-14 mb-5 opacity-10" />
          <p class="text-[10px] font-bold uppercase tracking-widest text-center px-10">{{ t('flashback.no_memories') }}</p>
        </div>
      </section>

      <div class="flex flex-col items-center gap-6 pb-20">
        <button 
          v-if="hasMultiple"
          @click="nextMemory"
          class="group relative px-8 py-4 rounded-[2rem] overflow-hidden transition-all btn-active shadow-lg"
          style="background: var(--bg-elevated);"
        >
          <div class="relative flex items-center gap-3">
            <Shuffle class="w-4.5 h-4.5 opacity-40 group-hover:rotate-180 transition-transform duration-700" />
            <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('flashback.shuffle') }}</span>
          </div>
        </button>

        <div v-if="hasMultiple" class="flex gap-1.5">
          <div 
            v-for="(_, i) in allFlashbacks" 
            :key="i"
            class="h-1 rounded-full transition-all duration-500"
            :class="currentIndex === i ? 'w-6 bg-orange-400' : 'w-1.5 bg-black/5 dark:bg-white/10'"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(1.05); }
}
.ease-spring { transition-timing-function: var(--ease-spring); }
</style>
