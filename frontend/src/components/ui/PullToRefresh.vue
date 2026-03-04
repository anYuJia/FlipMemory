<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

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
let listenersBound = false
const { t } = useI18n()

const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled || isRefreshing.value) return

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
    await new Promise(resolve => setTimeout(resolve, 1000))
    isRefreshing.value = false
  }

  isPulling.value = false
  pullDistance.value = 0
  canPull.value = false
}

const complete = () => {
  isRefreshing.value = false
  isPulling.value = false
  pullDistance.value = 0
}

defineExpose({ complete })

function bindListeners() {
  if (listenersBound) return
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  listenersBound = true
}

function unbindListeners() {
  if (!listenersBound) return
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  listenersBound = false
  // 清理拖拽状态，防止脏状态残留到下次激活
  isPulling.value = false
  pullDistance.value = 0
  canPull.value = false
}

onMounted(bindListeners)
onUnmounted(unbindListeners)
// KeepAlive 支持：组件缓存后恢复/暂停事件监听
onActivated(bindListeners)
onDeactivated(unbindListeners)
</script>

<template>
  <div class="relative">
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
          {{ isRefreshing ? t('pull_to_refresh.refreshing') : pullDistance >= props.threshold ? t('pull_to_refresh.release') : t('pull_to_refresh.pull') }}
        </span>
      </div>
    </div>
    
    <!-- 内容 -->
    <slot />
  </div>
</template>
