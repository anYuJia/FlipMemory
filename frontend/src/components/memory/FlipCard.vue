<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MapPin, Sun, Heart, Calendar, Camera } from 'lucide-vue-next'
import type { Memory } from '@/types'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  memory: Memory
}>()

const { t } = useI18n()

const formattedDate = computed(() => {
  return new Date(props.memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const formattedYear = computed(() => {
  return new Date(props.memory.date).getFullYear()
})

const isFlipped = ref(false)
const imageError = ref(false)

watch(() => props.memory, () => {
  imageError.value = false
  isFlipped.value = false
})

// ===== 手势逻辑 =====
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let handledBySwipe = false // swipe 与 click 互斥标记

const swipeThreshold = 80   // 水平滑动触发翻转的最小距离（像素）

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  touchStartX = touch.screenX
  touchStartY = touch.screenY
  touchStartTime = Date.now()
  handledBySwipe = false
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  const deltaX = Math.abs(touch.screenX - touchStartX)
  const deltaY = Math.abs(touch.screenY - touchStartY)

  // 垂直移动大于水平移动 → 用户在滚动页面，不触发翻转
  if (deltaY > deltaX) return

  // 水平滑动超过阈值 → 翻转
  if (deltaX > swipeThreshold) {
    isFlipped.value = !isFlipped.value
    handledBySwipe = true
  }
}

const toggleFlip = () => {
  // 如果刚被 swipe 处理过，跳过本次 click（移动端 tap 会连续触发 touchend + click）
  if (handledBySwipe) {
    handledBySwipe = false
    return
  }

  // 仅在移动端，判断 tap 是否为"原地轻点"（排除拖拽后松手产生的 click）
  if (touchStartTime > 0) {
    const elapsed = Date.now() - touchStartTime
    // 超过 300ms 的触摸不视为 tap（长按 / 拖拽）
    if (elapsed > 300) return
  }

  isFlipped.value = !isFlipped.value
}

const handleImageError = () => { imageError.value = true }
</script>

<template>
  <div
    class="flip-card-container group"
    role="button"
    tabindex="0"
    :aria-label="`Memory from ${formattedDate} ${formattedYear}`"
    :aria-expanded="isFlipped"
    @click="toggleFlip"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
    @keydown.enter="toggleFlip"
  >
    <div class="flip-card-inner" :class="{ 'is-flipped': isFlipped }">
      <!-- 正面：艺廊级照片呈现 -->
      <div class="flip-card-front relative overflow-hidden bg-slate-100 dark:bg-slate-900">
        <!-- 占位状态：无照片、加载中或加载失败 -->
        <div 
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" 
          v-if="!memory.photos?.[0] || imageError"
        >
          <div class="flex flex-col items-center gap-2 opacity-20">
            <Camera class="w-10 h-10" />
            <span class="text-[8px] font-black uppercase tracking-widest">{{ t('image.load_failed') }}</span>
          </div>
        </div>

        <img
          v-if="memory.photos?.[0] && !imageError"
          :src="memory.photos[0].mediumUrl || memory.photos[0].originalUrl"
          :alt="`${formattedDate} ${formattedYear}`"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          @error="handleImageError"
        />

        <!-- 渐变遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
        
        <!-- 底部信息 -->
        <div class="absolute bottom-0 inset-x-0 p-6 flex items-end justify-between">
          <div class="flex flex-col gap-1 text-white">
            <div class="flex items-center gap-2 opacity-60">
              <Calendar class="w-3 h-3" />
              <span class="text-[10px] font-bold uppercase tracking-widest">{{ formattedDate }}</span>
            </div>
            <h3 class="text-2xl font-serif italic tracking-tighter leading-tight">{{ formattedYear }}</h3>
          </div>
          
          <div v-if="memory.mood" class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-2xl shadow-xl">
            {{ MoodEmoji[memory.mood as MoodType] }}
          </div>
        </div>
      </div>

      <!-- 背面：文字与细节 -->
      <div class="flip-card-back relative p-8 flex flex-col grainy-overlay">
        <!-- 顶部装饰 -->
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-3">
            <div class="w-1 h-4 rounded-full bg-gradient-accent"></div>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">{{ formattedDate }}</span>
          </div>
          <Heart class="w-4 h-4 opacity-20" :class="{ 'fill-red-500 text-red-500 opacity-100': memory.mood === 'loved' }" />
        </div>

        <!-- 内容区域（阻止滚动时冒泡翻转） -->
        <div class="flex-1 overflow-y-auto hide-scrollbar" @click.stop @touchstart.stop @touchend.stop>
          <p class="text-sm font-medium leading-relaxed opacity-80 first-letter:text-2xl first-letter:font-serif first-letter:italic first-letter:mr-1 first-letter:text-orange-500" style="color: var(--text-primary);">
            {{ memory.content || t('detail.no_entry') }}
          </p>
        </div>

        <!-- 底部细节 -->
        <div class="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-4">
          <div v-if="memory.location" class="flex items-center gap-1.5 opacity-40">
            <MapPin class="w-3 h-3" />
            <span class="text-[9px] font-bold tracking-tight">{{ memory.location }}</span>
          </div>
          <div v-if="memory.weather" class="flex items-center gap-1.5 opacity-40">
            <Sun class="w-3 h-3" />
            <span class="text-[9px] font-bold tracking-tight uppercase">{{ memory.weather }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-card-container {
  perspective: 2000px; /* 增加视距，让 3D 效果更自然 */
  width: 100%;
  height: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-y; /* 允许纵向滚动页面，但拦截横向手势 */
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  transform-style: preserve-3d;
}

/* 仅在翻转时开启 GPU 加速，避免常驻占用显存 */
.flip-card-inner.is-flipped {
  transform: rotateY(180deg);
  will-change: transform;
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden; /* 必须：隐藏背面 */
  backface-visibility: hidden;
  border-radius: 2.5rem;
  overflow: hidden;
  transform: translateZ(0); /* 提升渲染层级 */
}

.flip-card-front {
  z-index: 2;
  background-color: var(--bg-tertiary);
}

.flip-card-back {
  transform: rotateY(180deg) translateZ(1px); /* 关键：微调 Z 轴防止层级闪烁 */
  background-color: var(--card-bg);
  backdrop-filter: blur(40px);
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 优化：翻转过程中减少复杂阴影计算 */
.flip-card-inner.is-flipped .flip-card-back {
  box-shadow: none;
}
</style>
