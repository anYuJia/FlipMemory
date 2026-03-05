<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { ArrowLeft, Edit3, Trash2, Share2, MapPin, Camera } from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { useConfirm } from '@/composables/useConfirm'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const { confirm } = useConfirm()
const { t, locale } = useI18n()

const date = route.params.date as string
const memory = computed(() => memoryStore.memories.get(date))
const isLoading = ref(false)
const isLoaded = ref(true)

const formattedDate = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString(locale.value, { month: 'long', day: 'numeric', weekday: 'long' })
})

const handleEdit = () => router.push({ name: 'edit-memory', params: { date } })
const handleDelete = async () => {
  if (await confirm({ title: t('common.delete'), message: t('detail.delete_confirm') })) {
    await memoryStore.deleteMemory(date)
    router.replace('/')
  }
}

const handleShare = () => { /* 分享逻辑 */ }
const goBack = () => router.back()

onMounted(async () => {
  if (!memory.value) {
    isLoading.value = true
    await memoryStore.fetchMemory(date)
    isLoading.value = false
  }
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.12] dark:opacity-[0.04]" style="background-color: var(--glow-primary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <button @click="goBack" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90">
          <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ t('route.memory_detail') }}</span>
          <h1 class="text-sm font-black tracking-tight mt-0.5" style="color: var(--text-primary);">{{ formattedDate }}</h1>
        </div>
        <button @click="handleShare" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90">
          <Share2 class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
      </div>
    </header>
    
    <div class="relative max-w-lg mx-auto px-6 py-4">
      <div v-if="isLoading" class="space-y-6">
        <div class="h-[450px] rounded-[2.5rem] skeleton shadow-inner"></div>
      </div>
      
      <div v-else-if="!memory" class="flex flex-col items-center justify-center py-20 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="relative w-32 h-32 mb-8">
          <div class="absolute inset-0 bg-orange-400 rounded-full blur-[50px] opacity-20 animate-pulse"></div>
          <div class="relative w-full h-full rounded-full border border-black/5 dark:border-white/10 flex items-center justify-center bg-white/50 dark:bg-white/5 backdrop-blur-md">
            <Camera class="w-10 h-10 opacity-20" style="color: var(--text-primary);" />
          </div>
        </div>
        <h3 class="text-xl font-black tracking-tight mb-2" style="color: var(--text-primary);">{{ $t('detail.blank_page') }}</h3>
        <p class="text-xs font-medium opacity-40 mb-8 tracking-widest uppercase" style="color: var(--text-primary);">{{ $t('detail.no_entry') }}</p>
        <button @click="router.push({ name: 'create-memory', query: { date } })" class="px-8 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all" style="background: var(--gradient-accent);">{{ $t('detail.start_writing') }}</button>
      </div>
      
      <div v-else class="transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="h-[480px] mb-8 relative z-10 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <FlipCard :memory="memory" />
        </div>
        
        <div class="mb-8 p-6 rounded-[2rem] card-static shadow-lg relative overflow-hidden">
          <div class="flex items-center justify-between relative z-10">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ $t('detail.date_captured') }}</span>
              <div class="font-black tracking-tight text-lg" style="color: var(--text-primary);">{{ formattedDate }}</div>
            </div>
            <div v-if="memory.mood" class="flex flex-col items-end gap-1">
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ t('create.current_mood') }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold opacity-60" style="color: var(--text-primary);">{{ t(`mood.${memory.mood}`) }}</span>
                <span class="text-2xl drop-shadow-sm">{{ MoodEmoji[memory.mood as MoodType] }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="memory.location || memory.weather" class="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-black/5 dark:border-white/5">
            <div v-if="memory.location" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5">
              <MapPin class="w-3 h-3 opacity-40" style="color: var(--text-primary);" />
              <span class="text-[10px] font-bold tracking-wider opacity-60" style="color: var(--text-primary);">{{ memory.location }}</span>
            </div>
          </div>
        </div>
        
        <div class="pb-24 grid grid-cols-2 gap-4">
          <button @click="handleEdit" class="flex flex-col items-center justify-center gap-2 py-5 rounded-[2rem] card-static hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all group">
            <Edit3 class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" style="color: var(--text-primary);" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 group-hover:opacity-100" style="color: var(--text-primary);">{{ $t('common.edit') }}</span>
          </button>
          <button @click="handleDelete" class="flex flex-col items-center justify-center gap-2 py-5 rounded-[2rem] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 active:scale-95 transition-all group">
            <Trash2 class="w-5 h-5 text-red-500 opacity-60 group-hover:opacity-100" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase text-red-500 opacity-60 group-hover:opacity-100">{{ $t('common.delete') }}</span>
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
