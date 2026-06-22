<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { safeBack } from '@/router'
import { 
  ArrowLeft, Camera, X, Check, Sparkles, 
  Edit3, MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, Loader2,
  Trash2
} from 'lucide-vue-next'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { logger } from '@/services/logger'
import { imageProcessor } from '@/utils/imageProcessor'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { offlinePhotoService } from '@/services/offlinePhotoService'
import type { Memory } from '@/types'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const toast = useToast()
const { t, locale } = useI18n()

// 状态控制
const isLoaded = ref(false)
const isSubmitting = ref(false)
const date = typeof route.params.date === 'string' ? route.params.date : ''

// 表单数据
const content = ref('')
const mood = ref<MoodType | ''>('')
const location = ref('')
const weather = ref('')

// 图片管理
// existingPhotos: 服务器已有的图片
// newPhotoFile: 新选中的待上传图片
const existingPhotos = ref<any[]>([])
const newPhotoFile = ref<File | null>(null)
const newPhotoPreview = ref<string | null>(null)
const photoToRemoveIds = ref<string[]>([]) // 标记需要从服务器删除的图片 ID

const moods: MoodType[] = ['happy', 'sad', 'angry', 'calm', 'excited', 'loved', 'thinking', 'tired']
const weatherOptions = [
  { id: 'sunny', icon: Sun },
  { id: 'cloudy', icon: Cloud },
  { id: 'rainy', icon: CloudRain },
  { id: 'windy', icon: Wind },
  { id: 'snowy', icon: Snowflake }
]

const formattedDate = computed(() => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString(locale.value, { month: 'long', day: 'numeric', year: 'numeric' })
})

// 初始化加载数据
onMounted(async () => {
  if (!date) {
    router.replace('/')
    return
  }

  let memory = memoryStore.memories.get(date)
  if (!memory) {
    memory = await memoryStore.fetchMemory(date) as Memory | undefined
  }

  if (memory) {
    content.value = memory.content || ''
    mood.value = memory.mood || ''
    location.value = memory.location || ''
    weather.value = memory.weather || ''
    existingPhotos.value = memory.photos ? [...memory.photos] : []
  } else {
    toast.error(t('detail.no_entry'))
    router.back()
  }
  
  setTimeout(() => { isLoaded.value = true }, 100)
})

// 处理新照片选择
const handlePhotoSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const processed = await imageProcessor.compress(file)
    newPhotoFile.value = processed
    newPhotoPreview.value = URL.createObjectURL(processed)
  } catch (err) { 
    logger.error('Failed to process image', 'EditView', err)
    toast.error(t('common.failed'))
  }
}

// 移除新选的照片
const removeNewPhoto = () => {
  if (newPhotoPreview.value) {
    URL.revokeObjectURL(newPhotoPreview.value)
  }
  newPhotoFile.value = null
  newPhotoPreview.value = null
}

onBeforeUnmount(() => {
  if (newPhotoPreview.value) {
    URL.revokeObjectURL(newPhotoPreview.value)
  }
})

// 标记移除现有照片
const removeExistingPhoto = (id: string) => {
  photoToRemoveIds.value.push(id)
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== id)
}

const selectMood = (m: MoodType) => {
  mood.value = mood.value === m ? '' : m
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  try {
    // 1. 如果有新照片，先保存到离线队列或上传
    let photoKeys: string[] = []
    let localPhotos: any[] = []

    if (newPhotoFile.value) {
      const uploadResult = await offlinePhotoService.savePhoto(date, newPhotoFile.value, {
        filename: newPhotoFile.value.name,
        order: existingPhotos.value.length,
      })

      if (uploadResult.isLocal) {
        localPhotos.push({
          id: uploadResult.id,
          key: uploadResult.key,
          originalUrl: uploadResult.originalUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          mediumUrl: uploadResult.mediumUrl,
          order: existingPhotos.value.length
        })
      } else {
        photoKeys.push(uploadResult.key)
      }
    }

    // 2. 调用 Store 的更新方法
    await memoryStore.updateMemory(date, {
      content: content.value,
      mood: mood.value || undefined,
      isPrivate: false,
      location: location.value || undefined,
      weather: weather.value || undefined,
      photoKeys: photoKeys.length > 0 ? photoKeys : undefined,
      removePhotoIds: photoToRemoveIds.value.length > 0 ? photoToRemoveIds.value : undefined,
    })

    toast.success(t('common.success'))
    router.replace({ name: 'memory-detail', params: { date } })
  } catch (err) {
    toast.error(t('common.failed'))
    logger.error('Failed to update memory', 'EditView', err)
  } finally {
    isSubmitting.value = false
  }
}

const goBack = () => safeBack()
</script>

<template>
  <div class="page-container min-h-screen relative bg-primary">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl border-b border-black/[0.03] dark:border-white/[0.03]">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <button @click="goBack" class="btn-back">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">{{ t('create.edit_mode') }}</span>
          <h1 class="text-sm font-black tracking-tight mt-0.5">{{ formattedDate }}</h1>
        </div>
        <button 
          @click="handleSubmit" 
          :disabled="isSubmitting" 
          class="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all shadow-lg active:scale-90"
          style="background: var(--gradient-accent);"
        >
          <Check v-if="!isSubmitting" class="w-5 h-5" />
          <Loader2 v-else class="w-5 h-5 animate-spin" />
        </button>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-8 space-y-10">
      <!-- 图片管理区 -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 opacity-30">
          <Camera class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-widest">{{ t('stats.photos') }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- 现有照片预览 -->
          <div v-for="photo in existingPhotos" :key="photo.id" class="relative aspect-square rounded-[1.5rem] overflow-hidden group shadow-sm border border-black/5 dark:border-white/5">
            <img :src="photo.thumbnailUrl || photo.originalUrl" class="w-full h-full object-cover" loading="lazy" />
            <button @click="removeExistingPhoto(photo.id)" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <!-- 新选照片预览 -->
          <div v-if="newPhotoPreview" class="relative aspect-square rounded-[1.5rem] overflow-hidden shadow-md ring-2 ring-orange-400">
            <img :src="newPhotoPreview" class="w-full h-full object-cover" />
            <button @click="removeNewPhoto" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
              <X class="w-4 h-4" />
            </button>
            <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-orange-500 text-[8px] font-black text-white uppercase tracking-widest">{{ t('common.new_label') }}</div>
          </div>

          <!-- 添加按钮 (如果照片不多于一定数量) -->
          <label v-if="!newPhotoPreview" class="cursor-pointer aspect-square rounded-[1.5rem] border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div class="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Sparkles class="w-5 h-5 opacity-20" />
            </div>
            <span class="text-[9px] font-black uppercase opacity-30">{{ t('create.take_photo') }}</span>
            <input type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
          </label>
        </div>
      </section>

      <!-- 文字内容 -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 opacity-30">
          <Edit3 class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-widest">{{ t('create.your_story') }}</span>
        </div>
        <textarea 
          v-model="content" 
          :placeholder="t('create.placeholder')" 
          class="w-full bg-transparent border-none focus:outline-none text-lg font-medium leading-relaxed placeholder:opacity-20 min-h-[200px]"
        ></textarea>
      </section>

      <!-- 心情选择 -->
      <section class="space-y-6">
        <div class="flex items-center gap-2 opacity-30">
          <Sparkles class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-widest">{{ t('create.current_mood') }}</span>
        </div>
        <div class="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2">
          <button 
            v-for="m in moods" 
            :key="m" 
            @click="selectMood(m)" 
            class="flex-shrink-0 flex flex-col items-center gap-3 transition-all duration-500"
            :style="{ 
              transform: mood === m ? 'scale(1.1) translateY(-4px)' : 'scale(1)',
              opacity: mood && mood !== m ? '0.3' : '1'
            }"
          >
            <div 
              class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-all"
              :style="{ background: mood === m ? 'var(--gradient-accent)' : 'var(--bg-tertiary)' }"
            >
              {{ MoodEmoji[m] }}
            </div>
            <span class="text-[9px] font-black uppercase tracking-widest opacity-40">{{ t(`mood.${m}`) }}</span>
          </button>
        </div>
      </section>

      <!-- 地点与天气 -->
      <section class="grid grid-cols-2 gap-4 pb-20">
        <div class="p-5 rounded-[2rem] card-static flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30">
            <MapPin class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ t('create.location_label') }}</span>
          </div>
          <input v-model="location" :placeholder="t('create.location_placeholder')" class="bg-transparent border-none outline-none text-xs font-bold w-full" />
        </div>

        <div class="p-5 rounded-[2rem] card-static flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30">
            <Sun class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ t('create.weather_label') }}</span>
          </div>
          <div class="flex gap-2">
            <button 
              v-for="opt in weatherOptions" 
              :key="opt.id" 
              @click="weather = opt.id" 
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              :style="{ 
                background: weather === opt.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                color: weather === opt.id ? '#fff' : 'var(--text-tertiary)'
              }"
            >
              <component :is="opt.icon" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar { display: none; }
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(20px);
}
</style>
