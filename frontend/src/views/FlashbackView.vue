<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onDeactivated } from 'vue'
import { Shuffle, ArrowLeft, ArrowRight, Clock, Heart } from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import { useMemoryStore } from '@/stores'
import { logger } from '@/services/logger'
import type { Memory } from '@/types'
import { useI18n } from 'vue-i18n'

const memoryStore = useMemoryStore()
const { t } = useI18n()

const isLoaded = ref(false)
const isLoading = ref(true)
const currentIndex = ref(0)
const activeTab = ref<'year' | 'random' | 'featured'>('year')

const flashbackData = ref<{ yearAgo: Memory | null; random: Memory[] }>({ yearAgo: null, random: [] })

const loadFlashback = async () => {
  isLoading.value = true
  try {
    const res = await memoryStore.getFlashback()
    if (res) flashbackData.value = res
  } catch (e) {
    logger.error('Failed to fetch flashback', 'Flashback', e)
  } finally {
    isLoading.value = false
  }
}

const flashbackMemories = computed<Memory[]>(() => {
  const memories: Memory[] = []
  const data = flashbackData.value || { yearAgo: null, random: [] }
  const randomList = data.random || []
  
  if (activeTab.value === 'year' && data.yearAgo) { 
    memories.push(data.yearAgo) 
  }
  
  if (activeTab.value === 'random' || activeTab.value === 'featured') { 
    memories.push(...randomList) 
  }
  
  if (activeTab.value === 'year' && !data.yearAgo && randomList.length > 0) {
    memories.push(...randomList)
  }
  
  return memories
})

const currentMemory = computed(() => flashbackMemories.value[currentIndex.value] || null)
const hasNext = computed(() => flashbackMemories.value.length > 0 && currentIndex.value < flashbackMemories.value.length - 1)
const hasPrev = computed(() => flashbackMemories.value.length > 0 && currentIndex.value > 0)

const flashbackDescription = computed(() => {
  if (!currentMemory.value) return t('flashback.title')
  const date = new Date(currentMemory.value.date)
  const now = new Date()
  const diffYears = now.getFullYear() - date.getFullYear()
  if (diffYears >= 1) return t('flashback.days_ago', { days: diffYears * 365 })
  return t('flashback.subtitle')
})

const nextMemory = () => { if (hasNext.value) currentIndex.value++ }
const prevMemory = () => { if (hasPrev.value) currentIndex.value-- }
const randomMemory = () => {
  const len = flashbackMemories.value.length
  if (len > 0) {
    currentIndex.value = Math.floor(Math.random() * len)
  }
}

// 核心修复：使用 computed 确保响应式翻译
const tabs = computed(() => [
  { id: 'year', icon: Clock, label: t('flashback.tabs.year') },
  { id: 'random', icon: Shuffle, label: t('flashback.tabs.random') },
  { id: 'featured', icon: Heart, label: t('flashback.tabs.featured') },
])

const switchTab = (tabId: 'year' | 'random' | 'featured') => {
  activeTab.value = tabId
  currentIndex.value = 0
}

onMounted(() => {
  loadFlashback()
  setTimeout(() => { isLoaded.value = true }, 100)
})

const scrollY = ref(0)
onActivated(() => {
  if (scrollY.value > 0) window.scrollTo(0, scrollY.value)
})
onDeactivated(() => { scrollY.value = window.scrollY })
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.04]" style="background-color: var(--color-primary);" />
    </div>
    
    <div class="relative max-w-lg mx-auto px-6">
      <header class="pt-16 pb-8 safe-area-top transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black tracking-[0.3em] uppercase opacity-40" style="color: var(--text-primary);">{{ t('nav.flashback') }}</span>
              <div class="w-1 h-1 rounded-full bg-orange-400 opacity-60"></div>
            </div>
            <h1 class="text-4xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('flashback.title') }}</h1>
          </div>
          <div class="px-4 py-2 rounded-2xl card-static shadow-sm">
            <span class="text-[10px] font-black tracking-widest uppercase opacity-40" style="color: var(--text-primary);">{{ flashbackDescription }}</span>
          </div>
        </div>
      </header>
      
      <section class="mb-10 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="relative flex p-1.5 rounded-[1.5rem] card-static shadow-sm">
          <div class="absolute top-1.5 bottom-1.5 rounded-[1.1rem] transition-all duration-500 ease-out"
            :style="{
              width: 'calc((100% - 12px) / 3)',
              left: activeTab === 'year' ? '6px' : activeTab === 'random' ? 'calc((100% - 12px) / 3 + 6px)' : 'calc((100% - 12px) / 3 * 2 + 6px)',
              backgroundColor: 'var(--color-primary)',
              opacity: '0.1'
            }"
          />
          <button v-for="tab in tabs" :key="tab.id" @click="switchTab(tab.id as 'year' | 'random' | 'featured')"
            class="relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300"
            :style="{ color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-tertiary)' }">
            <component :is="tab.icon" class="w-4 h-4" />
            <span class="text-[10px] font-black uppercase tracking-widest">{{ tab.label }}</span>
          </button>
        </div>
      </section>
      
      <section class="mb-10 transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div v-if="isLoading" class="h-[480px] flex items-center justify-center card-static rounded-[2.5rem]">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-orange-400/20 border-t-orange-400 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black uppercase tracking-widest opacity-40">{{ t('common.loading') }}</p>
          </div>
        </div>
        <div v-else-if="currentMemory" class="h-[480px] shadow-2xl rounded-[2.5rem] overflow-hidden">
          <FlipCard :memory="currentMemory" />
        </div>
        <div v-else class="flex flex-col items-center justify-center py-24 card-static rounded-[2.5rem]">
          <p class="text-sm font-bold opacity-40" style="color: var(--text-primary);">{{ t('flashback.no_memories') }}</p>
        </div>
      </section>
      
      <div v-if="flashbackMemories.length > 0" class="pb-32 transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center justify-between mb-10">
          <button @click="prevMemory" :disabled="!hasPrev" class="btn-back w-14 h-14 rounded-2xl disabled:opacity-10">
            <ArrowLeft class="w-5 h-5 opacity-40" />
          </button>
          <div class="flex items-center gap-2">
            <span v-for="(_, index) in flashbackMemories" :key="index" class="h-1 rounded-full transition-all duration-500"
              :style="{ width: index === currentIndex ? '24px' : '6px', background: index === currentIndex ? 'var(--color-primary)' : 'var(--border-primary)' }" />
          </div>
          <button @click="nextMemory" :disabled="!hasNext" class="btn-back w-14 h-14 rounded-2xl disabled:opacity-10">
            <ArrowRight class="w-5 h-5 opacity-40" />
          </button>
        </div>
        <div class="flex justify-center">
          <button @click="randomMemory" class="flex items-center gap-3 px-8 py-5 rounded-[2rem] text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-xl active:scale-95"
            style="background: var(--gradient-accent);">
            <Shuffle class="w-4 h-4" /> <span>{{ t('flashback.shuffle') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
</style>
