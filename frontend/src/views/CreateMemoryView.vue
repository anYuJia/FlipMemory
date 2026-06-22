<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { ArrowLeft, Camera, Image, X, Check, Sparkles, Edit3, MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, Loader2 } from 'lucide-vue-next'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { logger } from '@/services/logger'
import { imageProcessor } from '@/utils/imageProcessor'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { offlinePhotoService } from '@/services/offlinePhotoService'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const toast = useToast()
const { t, locale } = useI18n()

const isLoaded = ref(true)
const isSubmitting = ref(false)
const date = typeof route.query.date === 'string' ? route.query.date : (new Date().toISOString().split('T')[0] ?? '')
const isEdit = computed(() => !!route.params.id)

const content = ref('')
const mood = ref<MoodType | ''>('')
const location = ref('')
const weather = ref('')
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)

const moods: MoodType[] = ['happy', 'sad', 'angry', 'calm', 'excited', 'loved', 'thinking', 'tired']
const weatherOptions = [
  { id: 'sunny', icon: Sun },
  { id: 'cloudy', icon: Cloud },
  { id: 'rainy', icon: CloudRain },
  { id: 'windy', icon: Wind },
  { id: 'snowy', icon: Snowflake }
]

const formattedDate = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString(locale.value, { month: 'long', day: 'numeric', weekday: 'long' })
})

const handlePhotoSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const processed = await imageProcessor.compress(file)
    photoFile.value = processed
    photoPreview.value = URL.createObjectURL(processed)
  } catch (err) {
    logger.error('Failed to process image', 'CreateView', err)
    toast.error(t('common.failed'))
  }
}

const removePhoto = () => {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoFile.value = null
  photoPreview.value = null
}

onBeforeUnmount(() => {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
})
const selectMood = (m: MoodType) => { mood.value = mood.value === m ? '' : m }

const handleSubmit = async () => {
  if (isSubmitting.value) return
  const trimmedContent = content.value.trim()
  const hasPayload = Boolean(trimmedContent || mood.value || location.value.trim() || weather.value || photoFile.value)
  if (!hasPayload) {
    toast.error(t('create.placeholder'))
    return
  }

  isSubmitting.value = true
  try {
    const photoKeys: string[] = []
    const localPhotos: Array<{
      id: string
      key?: string | null
      originalUrl: string
      thumbnailUrl: string
      mediumUrl: string
      takenAt?: string | null
      width?: number | null
      height?: number | null
      order?: number
    }> = []

    if (photoFile.value) {
      const uploadResult = await offlinePhotoService.savePhoto(date, photoFile.value, {
        filename: photoFile.value.name || `memory-${date}.jpg`,
        order: 0,
      })

      if (uploadResult.isLocal) {
        localPhotos.push({
          id: uploadResult.id,
          key: uploadResult.key,
          originalUrl: uploadResult.originalUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          mediumUrl: uploadResult.mediumUrl,
          takenAt: null,
          width: null,
          height: null,
          order: 0,
        })
      } else {
        photoKeys.push(uploadResult.key)
      }
    }

    await memoryStore.createMemory({
      date,
      content: trimmedContent || undefined,
      mood: mood.value || undefined,
      location: location.value.trim() || undefined,
      weather: weather.value || undefined,
      photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
      localPhotos: localPhotos.length > 0 ? localPhotos : undefined,
    })
    toast.success(t('common.success'))
    router.push('/')
  } catch (err) {
    toast.error(t('common.failed'))
    logger.error('Failed to save memory', 'CreateView', err) 
  } finally { 
    isSubmitting.value = false 
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.04]" style="background-color: var(--glow-primary);" />
      <div class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.08] dark:opacity-[0.03]" style="background-color: var(--glow-secondary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top transition-all duration-500">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <button @click="goBack" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90 shadow-sm">
          <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ isEdit ? t('create.edit_mode') : t('create.new_entry') }}</span>
          <h1 class="text-sm font-black tracking-tight mt-0.5" style="color: var(--text-primary);">{{ formattedDate }}</h1>
        </div>
        <button @click="handleSubmit" :disabled="isSubmitting" class="w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all shadow-xl active:scale-90" style="background: var(--gradient-accent);">
          <Check v-if="!isSubmitting" class="w-5 h-5" />
          <Loader2 v-else class="w-5 h-5 animate-spin" />
        </button>
      </div>
    </header>
    
    <div class="relative max-w-lg mx-auto px-6 py-4 space-y-10">
      <!-- 预览区 -->
      <section class="transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="rounded-[2.5rem] overflow-hidden shadow-2xl relative group card-static aspect-[4/5] flex items-center justify-center border-dashed">
          <div v-if="photoPreview" class="h-full w-full">
            <img :src="photoPreview" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            <button @click="removePhoto" class="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/80 bg-black/20 backdrop-blur-xl border border-white/10 hover:bg-black/40 transition-all"><X class="w-4 h-4" /></button>
          </div>
          
          <div v-else class="flex flex-col items-center gap-8 p-10 w-full">
            <div class="w-20 h-20 rounded-full flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.03]">
              <Camera class="w-8 h-8 opacity-10" style="color: var(--text-primary);" />
            </div>
            
            <!-- 修复：不再使用 bg-white，改用品牌色和暗色适配按钮 -->
            <div class="grid grid-cols-1 gap-4 w-full max-w-[220px]">
              <label class="cursor-pointer">
                <div class="py-4 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-95">
                  <Camera class="w-4 h-4" /> {{ $t('create.take_photo') }}
                </div>
                <input type="file" accept="image/*" capture="environment" class="hidden" @change="handlePhotoSelect" />
              </label>
              
              <label class="cursor-pointer">
                <div class="py-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-main text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95">
                  <Image class="w-4 h-4 opacity-40" /> {{ $t('create.gallery') }}
                </div>
                <input type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
              </label>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 故事 -->
      <section class="transition-all duration-700 delay-200" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center gap-2 mb-4 opacity-30" style="color: var(--text-primary);">
          <Edit3 class="w-4 h-4" /> <span class="text-[10px] font-black tracking-[0.2em] uppercase">{{ $t('create.your_story') }}</span>
        </div>
        <textarea v-model="content" :placeholder="$t('create.placeholder')" class="w-full bg-transparent border-none focus:outline-none text-xl font-medium leading-[1.8] placeholder:opacity-20 transition-all min-h-[180px]" style="color: var(--text-primary);"></textarea>
      </section>

      <!-- 心情 -->
      <section class="transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="flex items-center gap-2 mb-6 opacity-30" style="color: var(--text-primary);">
          <Sparkles class="w-4 h-4" /> <span class="text-[10px] font-black tracking-[0.2em] uppercase">{{ $t('create.current_mood') }}</span>
        </div>
        <div class="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2">
          <button v-for="m in moods" :key="m" @click="selectMood(m)" class="flex-shrink-0 flex flex-col items-center gap-3 transition-all duration-500" :style="{ transform: mood === m ? 'scale(1.1) translateY(-4px)' : 'scale(1)', opacity: mood && mood !== m ? '0.3' : '1' }">
            <div class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm transition-all" :style="{ background: mood === m ? 'var(--gradient-accent)' : 'var(--bg-tertiary)' }">{{ MoodEmoji[m] }}</div>
            <span class="text-[10px] font-black tracking-widest uppercase opacity-40" style="color: var(--text-primary);">{{ t(`mood.${m}`) }}</span>
          </button>
        </div>
      </section>

      <!-- 底部卡片 -->
      <section class="grid grid-cols-2 gap-4 pb-32 transition-all duration-700 delay-400" :style="{ opacity: isLoaded ? 1 : 0 }">
        <div class="p-5 rounded-[2rem] card-static flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30" style="color: var(--text-primary);">
            <MapPin class="w-3.5 h-3.5" /> <span class="text-[9px] font-black tracking-[0.2em] uppercase">{{ $t('create.location_label') }}</span>
          </div>
          <input v-model="location" :placeholder="$t('create.location_placeholder')" class="bg-transparent border-none focus:outline-none text-xs font-bold w-full" style="color: var(--text-primary);" />
        </div>
        <div class="p-5 rounded-[2rem] card-static flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30" style="color: var(--text-primary);">
            <Sun class="w-3.5 h-3.5" /> <span class="text-[9px] font-black tracking-[0.2em] uppercase">{{ $t('create.weather_label') }}</span>
          </div>
          <div class="flex gap-2">
            <button v-for="opt in weatherOptions" :key="opt.id" @click="weather = opt.id" class="w-8 h-8 rounded-full flex items-center justify-center transition-all" :style="{ background: weather === opt.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)', color: weather === opt.id ? '#fff' : 'var(--text-tertiary)' }"><component :is="opt.icon" class="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
.text-main { color: var(--text-primary); }
.hide-scrollbar::-webkit-scrollbar { display: none; }
</style>
