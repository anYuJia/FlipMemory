<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemoryStore } from '@/stores'
import { ArrowLeft, Edit3, Trash2, Share2, Calendar, Heart, MapPin, Cloud, Camera, Sun, CloudRain, Wind, Snowflake } from 'lucide-vue-next'
import FlipCard from '@/components/memory/FlipCard.vue'
import { MoodEmoji, MoodLabel } from '@/types/memory'

// 天气图标映射
const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  windy: Wind,
  snowy: Snowflake,
}

const route = useRoute()
const router = useRouter()
const memoryStore = useMemoryStore()

const isLoaded = ref(false)
const date = computed(() => route.params.date as string)
const memory = computed(() => memoryStore.memories.get(date.value))
const isLoading = ref(true)

// 格式化日期显示
const formattedDate = computed(() => {
  if (!date.value) return ''
  const d = new Date(date.value)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[d.getDay()]}`
})

// 获取首张照片的拍摄时间
const photoTakenAt = computed(() => {
  const photo = memory.value?.photos?.[0]
  if (!photo?.takenAt) return null
  return new Date(photo.takenAt)
})

// 格式化拍摄时间（本地时间）
const formatPhotoTime = (d: Date): string => {
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

const goBack = () => {
  router.back()
}

const handleEdit = () => {
  router.push({ name: 'create-memory', query: { date: date.value, edit: '1' } })
}

const handleDelete = async () => {
  if (!confirm('确定要删除这条记忆吗？')) return
  
  const success = await memoryStore.deleteMemory(date.value)
  if (success) {
    router.push({ name: 'calendar' })
  }
}

const handleShare = () => {
  alert('分享功能即将上线')
}

// 天气标签映射
const weatherLabels: Record<string, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '雨天',
  windy: '刮风',
  snowy: '下雪',
}

onMounted(async () => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
  
  isLoading.value = true
  await memoryStore.fetchMemory(date.value)
  isLoading.value = false
})
</script>

<template>
  <div class="page-container">
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
      <div 
        class="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full blur-[80px] opacity-30"
        style="background: var(--glow-blue);"
      />
    </div>
    
    <!-- 头部导航 - 极简通透 -->
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
        
        <!-- 标题区域 -->
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Memory</span>
          <h1 class="text-sm font-black tracking-tight mt-0.5" style="color: var(--text-primary);">
            {{ formattedDate }}
          </h1>
        </div>
        
        <button 
          @click="handleShare"
          class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-black/5 active:scale-90 bg-white/40 backdrop-blur-xl border border-white/40"
        >
          <Share2 class="w-5 h-5 opacity-40" />
        </button>
      </div>
    </header>
    
    <!-- 内容区域 -->
    <div class="relative max-w-lg mx-auto px-6 py-4">
      <!-- 加载中 -->
      <div v-if="isLoading" class="space-y-6">
        <div class="h-[450px] rounded-[2.5rem] skeleton"></div>
        <div class="h-20 rounded-[2rem] skeleton"></div>
      </div>
      
      <!-- 记忆不存在 -->
      <div 
        v-else-if="!memory" 
        class="flex flex-col items-center justify-center py-20"
        :class="{ 'animate-fade-in': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="relative w-32 h-32 mb-8">
          <div class="absolute inset-0 bg-orange-400 rounded-full blur-[50px] opacity-20 animate-pulse"></div>
          <div class="relative w-full h-full rounded-full border border-black/5 flex items-center justify-center bg-white/50 backdrop-blur-md">
            <Camera class="w-10 h-10 opacity-20" />
          </div>
        </div>
        
        <h3 class="text-xl font-black tracking-tight mb-2" style="color: var(--text-primary);">A Blank Page</h3>
        <p class="text-xs font-medium opacity-40 mb-8 tracking-widest uppercase">这一天还没有留下印记</p>
        
        <button 
          @click="router.push({ name: 'create-memory', query: { date } })"
          class="px-8 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl"
          style="background: var(--gradient-accent); box-shadow: 0 12px 32px -8px rgba(251, 146, 60, 0.5);"
        >
          Start Writing
        </button>
      </div>
      
      <!-- 记忆内容 -->
      <div 
        v-else
        :class="{ 'animate-slide-up': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <!-- 翻转卡片 - 给定更大空间 -->
        <div class="h-[480px] mb-8 relative z-10">
          <FlipCard :memory="memory" />
        </div>
        
        <!-- 记忆元数据卡片 - 深度玻璃拟态 -->
        <div 
          class="mb-8 p-6 rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg relative overflow-hidden"
          :class="{ 'animate-slide-up delay-100': isLoaded }"
        >
          <!-- 内部装饰光 -->
          <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-10 bg-orange-400 pointer-events-none"></div>

          <div class="flex items-center justify-between relative z-10">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Date Captured</span>
              <div class="font-black tracking-tight text-lg">{{ formattedDate }}</div>
            </div>
            
            <!-- 心情显示 -->
            <div 
              v-if="memory.mood"
              class="flex flex-col items-end gap-1"
            >
              <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Mood</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold opacity-60">{{ MoodLabel[memory.mood] }}</span>
                <span class="text-2xl drop-shadow-sm">{{ MoodEmoji[memory.mood] }}</span>
              </div>
            </div>
          </div>
          
          <!-- 位置、天气、拍摄时间信息 -->
          <div 
            v-if="memory.location || memory.weather || photoTakenAt"
            class="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-black/5 relative z-10"
          >
            <div v-if="memory.location" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5">
              <MapPin class="w-3 h-3 opacity-40" />
              <span class="text-[10px] font-bold tracking-wider opacity-60">{{ memory.location }}</span>
            </div>
            <div v-if="memory.weather" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5">
              <component :is="weatherIcons[memory.weather] || Cloud" class="w-3 h-3 opacity-40" />
              <span class="text-[10px] font-bold tracking-wider opacity-60">{{ weatherLabels[memory.weather] || memory.weather }}</span>
            </div>
            <div v-if="photoTakenAt" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5">
              <Camera class="w-3 h-3 opacity-40" />
              <span class="text-[10px] font-bold tracking-wider opacity-60">{{ formatPhotoTime(photoTakenAt) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 - 极简排版 -->
        <div 
          class="pb-24 grid grid-cols-2 gap-4"
          :class="{ 'animate-slide-up delay-200': isLoaded }"
        >
          <button 
            @click="handleEdit"
            class="flex flex-col items-center justify-center gap-2 py-5 rounded-[2rem] bg-white border border-black/5 transition-all hover:bg-black/5 active:scale-95 shadow-sm group"
          >
            <Edit3 class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Edit</span>
          </button>
          
          <button 
            @click="handleDelete"
            class="flex flex-col items-center justify-center gap-2 py-5 rounded-[2rem] bg-red-50/50 border border-red-100 transition-all hover:bg-red-50 active:scale-95 shadow-sm group"
          >
            <Trash2 class="w-5 h-5 text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase text-red-400 opacity-60 group-hover:opacity-100 transition-opacity">Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
