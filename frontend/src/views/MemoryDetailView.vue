<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { 
  ArrowLeft, Edit3, Trash2, Share2, MapPin, 
  Cloud, Wind, Sun, Snowflake, CloudRain
} from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import { safeBack } from '@/router'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const { confirm } = useConfirm()
const toast = useToast()
const { t, locale } = useI18n()

const date = route.params.date as string
const memory = computed(() => memoryStore.memories.get(date))
const isLoading = ref(false)
const isVisible = ref(false)

const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  windy: Wind,
  snowy: Snowflake
}

const formattedDateDay = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString(locale.value, { day: '2-digit' })
})

const formattedMonthYear = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString(locale.value, { month: 'short', year: 'numeric' }).toUpperCase()
})

const handleEdit = () => router.push({ name: 'edit-memory', params: { date } })

const handleDelete = async () => {
  if (await confirm({
    title: t('common.delete'),
    message: t('detail.delete_confirm'),
    type: 'danger'
  })) {
    try {
      await memoryStore.deleteMemory(date)
      toast.success(t('common.success'))
      router.replace('/')
    } catch (err: any) {
      toast.error(err.message || t('common.failed'))
    }
  }
}

const handleShare = () => { /* 实现分享逻辑 */ }
const goBack = () => safeBack()

onMounted(async () => {
  if (!memory.value) {
    isLoading.value = true
    await memoryStore.fetchMemory(date)
    if (memoryStore.error) {
      toast.error(memoryStore.error)
    }
    isLoading.value = false
  }
  setTimeout(() => { isVisible.value = true }, 100)
})
</script>

<template>
  <div class="page-container bg-primary min-h-screen relative overflow-x-hidden">
    <!-- 全屏封面层 -->
    <div class="fixed top-0 inset-x-0 h-[55vh] pointer-events-none z-0">
      <div v-if="memory?.photos?.[0]" class="w-full h-full relative">
        <img 
          :src="memory.photos[0].mediumUrl || memory.photos[0].originalUrl" 
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[var(--bg-primary)]"></div>
      </div>
      <div v-else class="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-primary)]"></div>
      </div>
    </div>

    <!-- 顶部导航 -->
    <header class="fixed top-0 z-50 w-full safe-area-top backdrop-blur-sm bg-white/5">
      <div class="max-w-lg mx-auto px-6 py-3 flex items-center justify-between">
        <button @click="goBack" class="btn-back bg-black/10 backdrop-blur-xl border border-white/10 text-white">
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <button @click="handleShare" class="btn-back bg-black/10 backdrop-blur-xl border border-white/10 text-white">
          <Share2 class="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
    
    <main class="relative z-10 pt-[35vh] pb-20">
      <div v-if="isLoading" class="px-7">
        <div class="h-80 rounded-[2.5rem] skeleton"></div>
      </div>
      
      <div v-else-if="memory" class="px-7 space-y-6 transition-all duration-1000" :style="{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(25px)' }">
        <div class="flex items-end justify-between mb-6">
          <div class="flex flex-col">
            <div class="flex items-baseline gap-2">
              <span class="text-6xl font-serif italic tracking-tighter leading-none" style="color: var(--text-primary);">{{ formattedDateDay }}</span>
              <div class="flex flex-col">
                <span class="text-[9px] font-black tracking-[0.2em] opacity-30">{{ formattedMonthYear }}</span>
                <div v-if="memory.mood" class="flex items-center gap-1 mt-0.5">
                  <span class="text-xl">{{ MoodEmoji[memory.mood as MoodType] }}</span>
                  <span class="text-[8px] font-black uppercase tracking-widest opacity-40">{{ t(`mood.${memory.mood}`) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex flex-col items-end gap-2">
            <div v-if="memory.weather" class="p-2.5 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-sm">
              <component :is="weatherIcons[memory.weather] || Sun" class="w-4 h-4 opacity-60" />
            </div>
            <div v-if="memory.location" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-white/20 dark:border-white/5">
              <MapPin class="w-2.5 h-2.5 opacity-40" />
              <span class="text-[8px] font-bold opacity-60">{{ memory.location }}</span>
            </div>
          </div>
        </div>

        <div class="p-7 rounded-[2.5rem] card-static grainy-overlay relative overflow-hidden min-h-[180px]">
          <div class="relative z-10">
            <p class="text-base font-medium leading-relaxed opacity-80 first-letter:text-4xl first-letter:font-serif first-letter:italic first-letter:mr-2 first-letter:float-left first-letter:text-orange-500" style="color: var(--text-primary);">
              {{ memory.content || '...' }}
            </p>
          </div>
        </div>

        <div class="h-[440px] shadow-premium rounded-[2.5rem] overflow-hidden">
          <FlipCard :memory="memory" />
        </div>

        <div class="flex gap-3 pb-6">
          <button @click="handleEdit" class="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[1.8rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[9px] tracking-widest transition-all btn-active shadow-lg">
            <Edit3 class="w-4 h-4" /> {{ $t('common.edit') }}
          </button>
          <button @click="handleDelete" class="w-16 flex items-center justify-center rounded-[1.8rem] bg-red-500/10 border border-red-500/20 text-red-500 transition-all btn-active">
            <Trash2 class="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div v-else class="px-7 pt-20 flex flex-col items-center justify-center space-y-8 transition-all duration-1000" :style="{ opacity: isVisible ? 1 : 0 }">
        <div class="w-32 h-32 rounded-full bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center border-2 border-dashed border-black/5 dark:border-white/10">
          <Edit3 class="w-10 h-10 opacity-10" />
        </div>
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-serif italic opacity-40">{{ t('detail.no_memory') || 'No memory for this day' }}</h2>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">{{ formattedDateDay }} {{ formattedMonthYear }}</p>
        </div>
        <button 
          @click="router.push({ name: 'create-memory', query: { date } })" 
          class="px-10 py-4 rounded-3xl bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest transition-all btn-active shadow-xl"
        >
          {{ t('common.create') || 'Create Now' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(40px) saturate(180%);
}
</style>
