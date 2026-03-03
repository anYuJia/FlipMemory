<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { ArrowLeft, Camera, Image, X, Check, Sparkles, Plus, Sun, Cloud, CloudRain, Wind, Snowflake, MapPin } from 'lucide-vue-next'
import type { MoodType } from '@/types'
import { MoodEmoji, MoodLabel } from '@/types/memory'
import api from '@/services/api'
import { processPhoto, type PhotoExifData } from '@/utils/imageProcessor'
import { sanitizeText, sanitizeForStorage } from '@/utils/xssSecurity'
import { logger } from '@/services/logger'
import { useToast } from '@/composables/useToast'
import ProgressBar from '@/components/ui/ProgressBar.vue'

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()
const toast = useToast()

const isLoaded = ref(false)
const date = ref(route.query.date as string || formatDate(new Date()))
const content = ref('')
const mood = ref<MoodType | null>(null)
const photoPreview = ref<string | null>(null)
const photoFile = ref<File | null>(null)  // 存储压缩后的文件
const photoExif = ref<PhotoExifData | null>(null)  // 存储 EXIF 数据
const isSubmitting = ref(false)
const isUploading = ref(false)
const isProcessing = ref(false)  // 图片处理中
const isFocused = ref(false)
const location = ref('')
const weather = ref('')
const uploadProgress = ref(0)  // 上传进度

// 天气选项
const weatherOptions = [
  { id: 'sunny', icon: Sun, label: '晴天' },
  { id: 'cloudy', icon: Cloud, label: '多云' },
  { id: 'rainy', icon: CloudRain, label: '雨天' },
  { id: 'windy', icon: Wind, label: '刮风' },
  { id: 'snowy', icon: Snowflake, label: '下雪' },
]

// 从相册进入的标志
const fromAlbum = computed(() => route.query.fromAlbum === 'true')

const isEdit = computed(() => route.query.edit === '1')

const formattedDate = computed(() => {
  const d = new Date(date.value)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[d.getDay()]}`
})

const moods: MoodType[] = ['happy', 'sad', 'angry', 'calm', 'excited', 'tired', 'loved', 'thinking']

const goBack = () => {
  router.back()
}

const selectMood = (m: MoodType) => {
  mood.value = mood.value === m ? null : m
}

// 处理照片选择
const handlePhotoSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return

  isProcessing.value = true

  try {
    // 处理照片：提取 EXIF + 压缩
    const result = await processPhoto(file)
    
    logger.debug('Photo processed', 'CreateMemory', {
      originalSize: `${(result.originalSize / 1024).toFixed(1)} KB`,
      compressedSize: `${(result.compressedSize / 1024).toFixed(1)} KB`,
      exif: result.exif,
    })

    // 存储压缩后的文件和 EXIF
    photoFile.value = result.file
    photoExif.value = result.exif
    
    // 如果 EXIF 中有位置且当前位置为空，则自动填充
    if (result.exif.location && !location.value) {
      location.value = result.exif.location
    }
    
    // 显示预览
    photoPreview.value = await fileToBase64(result.file)
  } catch (error) {
    logger.error('Failed to process photo', 'CreateMemory', error)
    toast.error('照片处理失败，请重试')
  } finally {
    isProcessing.value = false
    // 清空 input
    input.value = ''
  }
}

// 文件转 Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Base64 转文件
const base64ToFile = (base64: string, fileName: string): File => {
  const arr = base64.split(',')
  const header = arr[0] || ''
  const data = arr[1] || ''
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(data)
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], fileName, { type: mime })
}

const removePhoto = () => {
  photoPreview.value = null
  photoFile.value = null
  photoExif.value = null
}

// 上传图片到服务器
const uploadPhoto = async (file: File): Promise<string | null> => {
  try {
    isUploading.value = true
    uploadProgress.value = 0

    // 1. 获取预签名 URL（使用 JPG 类型）
    const { uploadUrl, key } = await api.upload.getPresignedUrl(
      file.name,
      'image/jpeg'
    )
    uploadProgress.value = 20

    // 2. 上传压缩后的文件到 MinIO（使用 XMLHttpRequest 以支持进度）
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', 'image/jpeg')

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // 进度从 20% 到 80%
          uploadProgress.value = 20 + Math.round((event.loaded / event.total) * 60)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(file)
    })

    uploadProgress.value = 85

    // 3. 确认上传，传递 EXIF 元数据
    await api.upload.confirm(key, {
      takenAt: photoExif.value?.takenAt?.toISOString() || null,
      latitude: photoExif.value?.latitude || null,
      longitude: photoExif.value?.longitude || null,
      width: photoExif.value?.width || null,
      height: photoExif.value?.height || null,
    })

    uploadProgress.value = 100

    return key
  } catch (error) {
    logger.error('Failed to upload photo', 'CreateMemory', error)
    return null
  } finally {
    isUploading.value = false
    // 延迟重置进度，让用户看到 100%
    setTimeout(() => {
      uploadProgress.value = 0
    }, 500)
  }
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  
  try {
    // 如果有照片，先上传
    let photos: Array<{
      key: string
      takenAt?: string | null
      latitude?: number | null
      longitude?: number | null
      width?: number | null
      height?: number | null
    }> | undefined

    if (photoFile.value) {
      const key = await uploadPhoto(photoFile.value)
      if (key) {
        photos = [{
          key,
          takenAt: photoExif.value?.takenAt?.toISOString() || null,
          latitude: photoExif.value?.latitude || null,
          longitude: photoExif.value?.longitude || null,
          width: photoExif.value?.width || null,
          height: photoExif.value?.height || null,
        }]
      }
    }
    
    await memoryStore.createMemory({
      date: date.value,
      content: sanitizeForStorage(content.value) || undefined,
      mood: mood.value || undefined,
      photos,
      location: sanitizeText(location.value) || undefined,
      weather: weather.value || undefined,
    })
    
    router.push({ name: 'memory-detail', params: { date: date.value } })
  } catch (error) {
    logger.error('Failed to create memory', 'CreateMemory', error)
    toast.error('保存失败，请重试')
  } finally {
    isSubmitting.value = false
  }
}

// 处理从相册传来的照片数据
const loadPendingPhotoData = async () => {
  const pendingData = sessionStorage.getItem('pendingPhotoData')
  if (!pendingData) return

  try {
    const data = JSON.parse(pendingData)
    
    // 转换 Base64 回文件
    const file = base64ToFile(data.file, data.fileName)
    
    photoFile.value = file
    photoPreview.value = data.file
    
    // 恢复 EXIF 数据
    photoExif.value = {
      ...data.exif,
      takenAt: data.exif.takenAt ? new Date(data.exif.takenAt) : null,
    }

    // 自动填充位置
    const photoLocation = photoExif.value?.location
    if (photoLocation && !location.value) {
      location.value = photoLocation
    }
  } catch (error) {
    logger.error('Failed to load pending photo data', 'CreateMemory', error)
  } finally {
    // 清除 sessionStorage
    sessionStorage.removeItem('pendingPhotoData')
  }
}

onMounted(async () => {
  requestAnimationFrame(() => {
    isLoaded.value = true
  })
  
  // 如果是从相册进入，加载待处理的照片
  if (fromAlbum.value) {
    await loadPendingPhotoData()
  }
  
  if (isEdit.value && date.value) {
    const memory = await memoryStore.fetchMemory(date.value)
    if (memory) {
      content.value = memory.content || ''
      mood.value = memory.mood
      if (memory.photos[0]) {
        photoPreview.value = memory.photos[0].mediumUrl
      }
      if (memory.location) location.value = memory.location
      if (memory.weather) weather.value = memory.weather
    }
  }
})

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatExifDate(d: Date): string {
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}
</script>

<template>
  <div class="page-container">
    <!-- 上传进度条 -->
    <ProgressBar
      :value="uploadProgress"
      :visible="isUploading"
      color="var(--color-primary)"
      height="3px"
    />

    <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--glow-secondary);"
      />
    </div>
    
    <!-- 头部导航 -->
    <header 
      class="sticky top-0 z-40 safe-area-top"
    >
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <button 
          @click="goBack"
          class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 active:scale-90 bg-white/40 backdrop-blur-xl border border-white/40"
        >
          <ArrowLeft class="w-5 h-5 opacity-40" />
        </button>
        
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">{{ isEdit ? 'Edit Mode' : 'New Entry' }}</span>
          <h1 class="text-sm font-black tracking-tight mt-0.5" style="color: var(--text-primary);">
            {{ formattedDate }}
          </h1>
        </div>
        
        <button 
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-30 text-white transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl"
          style="background: var(--gradient-accent); box-shadow: 0 8px 24px -6px rgba(251, 146, 60, 0.5);"
        >
          <Check class="w-5 h-5" />
        </button>
      </div>
    </header>
    
    <!-- 内容区域 -->
    <div class="relative max-w-lg mx-auto px-6 py-4">
      <!-- 极简日期标签 -->
      <div 
        class="mb-8 flex justify-center"
        :class="{ 'animate-slide-up': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="px-4 py-1.5 rounded-full bg-black/[0.03] text-[10px] font-black tracking-[0.2em] uppercase opacity-40">
          {{ date }}
        </div>
      </div>
      
      <!-- 照片预览 - 艺廊级 -->
      <div 
        class="mb-10"
        :class="{ 'animate-slide-up delay-100': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="rounded-[2.5rem] overflow-hidden shadow-2xl relative group bg-white/40 backdrop-blur-md border border-white/40"
          style="aspect-ratio: 4/5;"
        >
          <div v-if="photoPreview" class="h-full w-full">
            <img :src="photoPreview" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            
            <button 
              @click="removePhoto"
              class="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/80 transition-all hover:bg-black/20 backdrop-blur-xl border border-white/10"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <!-- 未选状态 -->
          <div v-else class="h-full w-full flex flex-col items-center justify-center gap-6 p-10">
            <div class="w-20 h-20 rounded-full flex items-center justify-center bg-black/[0.03] animate-pulse">
              <Camera class="w-8 h-8 opacity-10" />
            </div>
            <div class="flex flex-col items-center gap-4 w-full">
              <label class="w-full">
                <div class="w-full py-4 rounded-2xl bg-black text-white text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Camera class="w-4 h-4" /> Take Photo
                </div>
                <input type="file" accept="image/*" capture="environment" class="hidden" @change="handlePhotoSelect" />
              </label>
              <label class="w-full">
                <div class="w-full py-4 rounded-2xl bg-white border border-black/5 text-black text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-black/5 active:scale-[0.98]">
                  <Image class="w-4 h-4 opacity-40" /> From Gallery
                </div>
                <input type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 禅意文本编辑 -->
      <div 
        class="mb-10"
        :class="{ 'animate-slide-up delay-200': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center gap-2 mb-4">
          <Edit3 class="w-4 h-4 opacity-30" />
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Your Story</span>
        </div>
        <textarea
          v-model="content"
          placeholder="今天的心情是..."
          class="w-full bg-transparent border-none focus:outline-none text-xl font-medium leading-[1.8] placeholder:opacity-20 transition-all"
          rows="6"
          style="color: var(--text-primary);"
        ></textarea>
      </div>

      <!-- 心情选择器 - 极简气泡 -->
      <div 
        class="mb-10"
        :class="{ 'animate-slide-up delay-300': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center gap-2 mb-6">
          <Sparkles class="w-4 h-4 opacity-30" />
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Current Mood</span>
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
              class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm transition-all duration-500"
              :style="{
                background: mood === m ? 'var(--gradient-accent)' : 'var(--bg-tertiary)',
                boxShadow: mood === m ? '0 12px 24px -8px rgba(251, 146, 60, 0.4)' : 'none'
              }"
            >
              {{ MoodEmoji[m] }}
            </div>
            <span class="text-[10px] font-black tracking-widest uppercase opacity-40">{{ MoodLabel[m] }}</span>
          </button>
        </div>
      </div>

      <!-- 附加信息 - 地点 & 天气 -->
      <div 
        class="grid grid-cols-2 gap-4 pb-32"
        :class="{ 'animate-slide-up delay-400': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="p-5 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/40 flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30">
            <MapPin class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black tracking-[0.2em] uppercase">Location</span>
          </div>
          <input 
            v-model="location" 
            placeholder="在哪儿？" 
            class="bg-transparent border-none focus:outline-none text-xs font-bold w-full"
          />
        </div>
        <div class="p-5 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/40 flex flex-col gap-3">
          <div class="flex items-center gap-2 opacity-30">
            <Sun class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black tracking-[0.2em] uppercase">Weather</span>
          </div>
          <div class="flex gap-2">
            <button 
              v-for="opt in weatherOptions.slice(0, 3)" 
              :key="opt.id"
              @click="weather = opt.id"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              :style="{ 
                background: weather === opt.id ? 'var(--color-primary)' : 'black/[0.03]',
                color: weather === opt.id ? 'white' : 'black/20'
              }"
            >
              <component :is="opt.icon" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.animate-bounce-subtle {
  animation: bounce-subtle 0.6s ease-in-out;
}
</style>
