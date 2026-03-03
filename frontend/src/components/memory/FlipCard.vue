<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Memory } from '@/types'
import { MoodEmoji } from '@/types/memory'
import { RotateCcw, MapPin, ImageIcon, Sun, Cloud, CloudRain, Wind, Snowflake, Edit3, Eye, Tag, Camera } from 'lucide-vue-next'
import ProgressiveImage from '@/components/ui/ProgressiveImage.vue'

interface Props {
  memory: Memory
}

const props = defineProps<Props>()
const isFlipped = ref(false)

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}

const formattedDate = computed(() => {
  const date = new Date(props.memory.date)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('zh-CN', { month: 'short' }),
    full: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }
})

// 天气图标映射
const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  windy: Wind,
  snowy: Snowflake,
}

// 天气标签映射
const weatherLabels: Record<string, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '雨天',
  windy: '刮风',
  snowy: '下雪',
}

const mainPhoto = computed(() => props.memory.photos[0] || null)

const router = useRouter()

const goToDetail = (e: Event) => {
  e.stopPropagation()
  router.push({ name: 'memory-detail', params: { date: props.memory.date } })
}

const goToEdit = (e: Event) => {
  e.stopPropagation()
  router.push({ name: 'create-memory', query: { date: props.memory.date, edit: '1' } })
}

const formatPhotoTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
</script>

<template>
  <div 
    class="flip-card h-full cursor-pointer group"
    :class="{ flipped: isFlipped }"
    @click="toggleFlip"
  >
    <div class="flip-card-inner">
      <!-- 正面：艺廊级照片呈现 -->
      <div class="flip-card-front pill-card overflow-hidden bg-white shadow-2xl">
        <div class="relative h-full w-full overflow-hidden">
          <!-- 照片背景 - 使用渐进式加载 -->
          <ProgressiveImage
            v-if="mainPhoto"
            :src="mainPhoto.mediumUrl || mainPhoto.originalUrl"
            :thumbnail-src="mainPhoto.thumbnailUrl"
            alt="记忆照片"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            :show-progress="false"
          />
          <div v-else class="w-full h-full bg-[#fdfbf7] flex items-center justify-center">
            <ImageIcon class="w-10 h-10 opacity-10" />
          </div>

          <!-- 极柔和的底层遮罩 - 增强可读性 -->
          <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-80"></div>
          
          <!-- 正面底部信息：极致纯净 -->
          <div class="absolute bottom-8 left-8 right-8 flex items-end justify-between">
            <div class="text-white">
              <div v-if="memory.location" class="flex items-center gap-1.5 mb-2 opacity-90">
                <MapPin class="w-3 h-3 text-orange-400" />
                <span class="text-[9px] font-bold uppercase tracking-[0.25em] text-shadow-sm">{{ memory.location }}</span>
              </div>
              <div class="flex items-baseline gap-3">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-5xl font-black tracking-tighter leading-none">{{ formattedDate.day }}</span>
                  <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">{{ formattedDate.month }}</span>
                    <div v-if="memory.weather" class="flex items-center gap-1 opacity-80">
                      <component :is="weatherIcons[memory.weather] || Cloud" class="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 情绪徽标：悬浮设计 -->
            <div v-if="memory.mood" class="w-14 h-14 rounded-[1.5rem] bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl shadow-2xl transform transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
              {{ MoodEmoji[memory.mood] }}
            </div>
          </div>
        </div>
      </div>

      <!-- 背面：纸质感内容 -->
      <div class="flip-card-back pill-card p-8 flex flex-col" style="background-color: var(--bg-elevated); background-image: radial-gradient(var(--border-primary) 0.5px, transparent 0.5px); background-size: 20px 20px;">
        <header class="flex-shrink-0 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
              {{ formattedDate.full }}
            </div>
            <div class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <RotateCcw class="w-3.5 h-3.5 text-black/20 dark:text-white/20" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="memory.mood" class="text-2xl drop-shadow-md">{{ MoodEmoji[memory.mood] }}</span>
            <div class="h-[1px] flex-1 bg-black/[0.03] dark:bg-white/[0.05]"></div>
          </div>
        </header>

        <section class="flex-1 overflow-y-auto hide-scrollbar min-h-0">
          <p class="text-[15px] leading-[1.8] font-medium whitespace-pre-wrap antialiased tracking-tight" style="color: var(--text-primary); opacity: 0.8;">
            {{ memory.content || '这一天，留下了无声的印记...' }}
          </p>
          
          <!-- 标签展示 -->
          <div v-if="memory.tags && memory.tags.length > 0" class="flex flex-wrap gap-2 mt-8">
            <div 
              v-for="tag in memory.tags" 
              :key="tag.id"
              class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] text-[9px] font-bold uppercase tracking-widest border border-black/[0.02] dark:border-white/[0.02]"
              style="color: var(--text-tertiary);"
            >
              <Tag class="w-2.5 h-2.5" />
              <span>{{ tag }}</span>
            </div>
          </div>
        </section>

        <!-- 底部操作区域 -->
        <div class="mt-8 pt-6 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-3">
          <button 
            @click.stop="goToDetail"
            class="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Eye class="w-4 h-4" />
            <span>Open Memory</span>
          </button>
          <button 
            @click.stop="goToEdit"
            class="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-white/10 border border-black/[0.05] dark:border-white/10 text-black/20 dark:text-white/20 transition-all hover:text-black dark:hover:text-white active:scale-95 shadow-sm"
          >
            <Edit3 class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-card {
  perspective: 2000px;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.2, 1, 0.2, 1);
  transform-style: preserve-3d;
}
.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 2rem;
}
.flip-card-back {
  transform: rotateY(180deg);
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.text-shadow-sm {
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
</style>
