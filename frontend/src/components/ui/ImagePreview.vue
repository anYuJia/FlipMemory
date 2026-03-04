<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  src: string
  alt?: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
const { t } = useI18n()


const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)

// 重置变换
const resetTransform = () => {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

// 缩放
const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.5, 4)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.5, 0.5)
}

// 旋转
const rotate = () => {
  rotation.value = (rotation.value + 90) % 360
}

// 处理滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 处理双击
const handleDoubleClick = () => {
  if (scale.value > 1) {
    resetTransform()
  } else {
    scale.value = 2
  }
}

// 处理拖动
const handleMouseDown = (e: MouseEvent) => {
  if (scale.value > 1) {
    isDragging.value = true
    startX.value = e.clientX - translateX.value
    startY.value = e.clientY - translateY.value
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    translateX.value = e.clientX - startX.value
    translateY.value = e.clientY - startY.value
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

// 触摸支持
const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (touch && e.touches.length === 1 && scale.value > 1) {
    isDragging.value = true
    startX.value = touch.clientX - translateX.value
    startY.value = touch.clientY - translateY.value
  }
}

const handleTouchMove = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (isDragging.value && touch && e.touches.length === 1) {
    e.preventDefault()
    translateX.value = touch.clientX - startX.value
    translateY.value = touch.clientY - startY.value
  }
}

const handleTouchEnd = () => {
  isDragging.value = false
}

// 关闭
const close = () => {
  resetTransform()
  emit('close')
}

// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    close()
  } else if (e.key === '+' || e.key === '=') {
    zoomIn()
  } else if (e.key === '-') {
    zoomOut()
  } else if (e.key === 'r' || e.key === 'R') {
    rotate()
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    resetTransform()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center"
        @click.self="close"
        @wheel.prevent="handleWheel"
      >
        <!-- 背景遮罩 -->
        <div 
          class="absolute inset-0"
          style="background: rgba(0, 0, 0, 0.9);"
        />
        
        <!-- 工具栏 -->
        <div 
          class="absolute top-0 left-0 right-0 safe-area-top z-10 flex items-center justify-between px-4 py-3"
          style="background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);"
        >
          <button 
            @click="close"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);"
          >
            <X class="w-5 h-5 text-white" />
          </button>
          
          <div class="flex items-center gap-2">
            <button 
              @click="zoomOut"
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);"
            >
              <ZoomOut class="w-5 h-5 text-white" />
            </button>
            <span class="text-white text-sm min-w-[50px] text-center">{{ Math.round(scale * 100) }}%</span>
            <button 
              @click="zoomIn"
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);"
            >
              <ZoomIn class="w-5 h-5 text-white" />
            </button>
            <button 
              @click="rotate"
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);"
            >
              <RotateCw class="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        <!-- 图片 -->
        <img
          :src="src"
          :alt="alt"
          class="relative max-w-full max-h-full object-contain select-none transition-transform duration-200"
          :class="{ 'cursor-grab': scale > 1, 'cursor-grabbing': isDragging }"
          :style="{
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${translateX / scale}px, ${translateY / scale}px)`,
            transitionProperty: isDragging ? 'none' : 'transform',
          }"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @dblclick="handleDoubleClick"
          draggable="false"
        />
        
        <!-- 提示 -->
        <div 
          class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-sm text-white/60"
        >
          {{ t('image.preview_hint') }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
