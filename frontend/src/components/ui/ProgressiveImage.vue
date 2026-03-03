<template>
  <div class="progressive-image" :class="{ loaded: isLoaded, error: hasError }">
    <!-- 低质量占位图 -->
    <img
      v-if="thumbnailSrc && !isLoaded"
      :src="thumbnailSrc"
      :alt="alt"
      class="thumbnail"
      :style="{ filter: `blur(${blurAmount}px)` }"
    />

    <!-- 骨架屏占位 -->
    <div v-if="!thumbnailSrc && !isLoaded && !hasError" class="skeleton-placeholder">
      <div class="skeleton-animation"></div>
    </div>

    <!-- 高质量图片 -->
    <img
      ref="mainImageRef"
      :src="isInView ? src : undefined"
      :alt="alt"
      class="main-image"
      :class="{ visible: isLoaded }"
      @load="onLoad"
      @error="onError"
    />

    <!-- 错误状态 -->
    <div v-if="hasError" class="error-placeholder">
      <span class="error-icon">📷</span>
      <span class="error-text">加载失败</span>
      <button v-if="retryable" @click="retry" class="retry-btn">重试</button>
    </div>

    <!-- 加载进度 -->
    <div v-if="showProgress && !isLoaded && !hasError" class="loading-progress">
      <div class="progress-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  src: string
  thumbnailSrc?: string
  alt?: string
  blurAmount?: number
  showProgress?: boolean
  retryable?: boolean
  lazy?: boolean
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  blurAmount: 20,
  showProgress: true,
  retryable: true,
  lazy: true,
  threshold: 0.1,
})

const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

const mainImageRef = ref<HTMLImageElement | null>(null)
const isLoaded = ref(false)
const hasError = ref(false)
const isInView = ref(!props.lazy)
const retryCount = ref(0)
const maxRetries = 3

let observer: IntersectionObserver | null = null

// 图片加载成功
function onLoad() {
  isLoaded.value = true
  hasError.value = false
  emit('load')
}

// 图片加载失败
function onError(event: Event) {
  hasError.value = true
  emit('error', event)
}

// 重试加载
function retry() {
  if (retryCount.value >= maxRetries) return

  retryCount.value++
  hasError.value = false
  isLoaded.value = false

  // 强制重新加载
  if (mainImageRef.value) {
    const currentSrc = mainImageRef.value.src
    mainImageRef.value.src = ''
    setTimeout(() => {
      if (mainImageRef.value) {
        mainImageRef.value.src = currentSrc
      }
    }, 100)
  }
}

// 设置 Intersection Observer
function setupObserver() {
  if (!props.lazy) {
    isInView.value = true
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isInView.value = true
          observer?.disconnect()
        }
      })
    },
    {
      threshold: props.threshold,
      rootMargin: '50px',
    }
  )

  if (mainImageRef.value?.parentElement) {
    observer.observe(mainImageRef.value.parentElement)
  }
}

// 监听 src 变化
watch(() => props.src, () => {
  isLoaded.value = false
  hasError.value = false
  retryCount.value = 0
})

onMounted(() => {
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.progressive-image {
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
}

.thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.main-image.visible {
  opacity: 1;
}

.progressive-image.loaded .thumbnail {
  opacity: 0;
}

.skeleton-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.error-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.error-text {
  font-size: 12px;
  margin-bottom: 8px;
}

.retry-btn {
  padding: 4px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #5568d3;
}

.loading-progress {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.progress-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
