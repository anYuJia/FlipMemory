<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Sun, Cloud, CloudRain, Wind, Snowflake, Heart, Calendar } from 'lucide-vue-next'
import type { Memory } from '@/types'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  memory: Memory
}>()

const { t, locale } = useI18n()

// 天气图标映射
const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  windy: Wind,
  snowy: Snowflake
}

// 动态获取本地化天气标签
const weatherLabel = computed(() => {
  const w = props.memory.weather
  if (w && w in weatherIcons) {
    return t(`create.weather.${w}`)
  }
  return ''
})

// 格式化日期：3月3日 -> March 3 / 3月3日
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat(locale.value, { 
    month: 'long', 
    day: 'numeric' 
  }).format(new Date(props.memory.date))
})

const formattedYear = computed(() => {
  return new Date(props.memory.date).getFullYear()
})
</script>

<template>
  <div class="flip-card-container group">
    <div class="flip-card-inner">
      <!-- 正面：艺廊级照片呈现 -->
      <div class="flip-card-front relative overflow-hidden">
        <div class="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" v-if="!memory.photos?.[0]"></div>
        <img 
          v-if="memory.photos?.[0]"
          :src="memory.photos[0].thumbnailUrl || memory.photos[0].originalUrl" 
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        
        <!-- 渐变遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
        
        <!-- 底部信息 -->
        <div class="absolute bottom-0 inset-x-0 p-6 flex items-end justify-between">
          <div class="flex flex-col gap-1 text-white">
            <div class="flex items-center gap-2 opacity-60">
              <Calendar class="w-3 h-3" />
              <span class="text-[10px] font-black uppercase tracking-widest">{{ formattedYear }}</span>
            </div>
            <h3 class="text-xl font-black tracking-tighter">{{ formattedDate }}</h3>
            <div v-if="memory.location" class="flex items-center gap-1.5 mt-1 opacity-80">
              <MapPin class="w-3 h-3" />
              <span class="text-[10px] font-bold truncate max-w-[120px]">{{ memory.location }}</span>
            </div>
          </div>
          
          <div v-if="memory.mood" class="w-12 h-12 rounded-2xl backdrop-blur-xl bg-white/20 border border-white/20 flex items-center justify-center text-2xl shadow-2xl">
            {{ MoodEmoji[memory.mood as MoodType] }}
          </div>
        </div>
      </div>

      <!-- 背面：文字内容 -->
      <div class="flip-card-back p-8 flex flex-col justify-between" style="background-color: var(--card-bg);">
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 rounded-full bg-orange-400"></div>
              <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{{ t('create.story_label') }}</span>
            </div>
            <div v-if="memory.weather" class="flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5">
              <component :is="weatherIcons[memory.weather as keyof typeof weatherIcons]" class="w-3 h-3 opacity-40" />
              <span class="text-[9px] font-bold opacity-40">{{ weatherLabel }}</span>
            </div>
          </div>
          
          <p class="text-sm font-medium leading-relaxed italic opacity-80 line-clamp-[12]" style="color: var(--text-primary);">
            “ {{ memory.content || '...' }} ”
          </p>
        </div>

        <div class="pt-6 border-t border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between">
          <span class="text-[9px] font-black opacity-20 uppercase tracking-widest">FlipMemory Archive</span>
          <Heart class="w-4 h-4 opacity-20" :class="{ 'fill-red-500 opacity-100 text-red-500': memory.mood === 'happy' }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-card-container {
  perspective: 1000px;
  width: 100%;
  height: 100%;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
}

.group:hover .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 2.5rem;
  overflow: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
</style>
