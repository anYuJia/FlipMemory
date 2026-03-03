<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RefreshCw } from 'lucide-vue-next'

const emit = defineEmits<{
  refresh: []
}>()

const props = withDefaults(defineProps<{
  threshold?: number
  disabled?: boolean
}>(), {
  threshold: 80,
  disabled: false,
})

const isPulling = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const startY = ref(0)

const canPull = ref(false)

const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled || isRefreshing.value) return
  
  // 只有在页面顶部时才能下拉
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  if (scrollTop !== 0) {
    canPull.value = false
    return
  }
  
  canPull.value = true
  const touch = e.touches[0]
  if (touch) {
    startY.value = touch.clientY
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!canPull.value || props.disabled || isRefreshing.value) return
  
  const touch = e.touches[0]
  if (!touch) return
  
  const currentY = touch.clientY
  const diff = currentY - startY.value
  
  if (diff > 0) {
    // 阻尼效果
    pullDistance.value = Math.min(diff * 0.5, props.threshold * 1.5)
    isPulling.value = true
    
    if (pullDistance.value > 20) {
      e.preventDefault()
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  
  if (pullDistance.value >= props.threshold) {
    isRefreshing.value = true
    emit('refresh')
    
    // 等待刷新完成（外部通过 complete 方法通知）
    // 这里设置一个最小显示时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    isRefreshing.value = false
  }
  
  isPulling.value = false
  pullDistance.value = 0
  canPull.value = false
}

// 暴露完成刷新的方法
const complete = () => {
  isRefreshing.value = false
  isPulling.value = false
  pullDistance.value = 0
}

defineExpose({ complete })

onMounted(() => {
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
})

onUnmounted(() => {
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
})
</script>

<template>
  <div ref="containerRef" class="relative">
    <!-- 下拉指示器 -->
    <div 
      class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300"
      :style="{ 
        height: isPulling || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px` : '0px',
        opacity: isPulling || isRefreshing ? 1 : 0,
      }"
    >
      <div 
        class="flex items-center gap-2 px-4 py-2 rounded-full"
        style="background: var(--card-bg); box-shadow: 0 4px 20px rgba(0,0,0,0.1);"
      >
        <RefreshCw 
          class="w-4 h-4 transition-transform duration-300"
          :class="{ 'animate-spin': isRefreshing }"
          :style="{ 
            transform: isRefreshing ? '' : `rotate(${(pullDistance / props.threshold) * 360}deg)`,
            color: pullDistance >= props.threshold ? 'var(--color-primary)' : 'var(--text-muted)'
          }"
        />
        <span 
          class="text-sm font-medium"
          :style="{ color: pullDistance >= props.threshold ? 'var(--color-primary)' : 'var(--text-muted)' }"
        >
          {{ isRefreshing ? '刷新中...' : pullDistance >= props.threshold ? '释放刷新' : '下拉刷新' }}
        </span>
      </div>
    </div>
    
    <!-- 内容 -->
    <slot />
  </div>
</template>
