<template>
  <div class="error-boundary">
    <div v-if="hasError" class="error-container">
      <div class="error-content">
        <div class="error-icon">{{ errorIcon }}</div>
        <h2>{{ errorTitle }}</h2>
        <p class="error-message">{{ errorMessage }}</p>

        <!-- 自动重试倒计时 -->
        <div v-if="autoRetryEnabled && retryCountdown > 0" class="retry-countdown">
          <div class="countdown-bar">
            <div
              class="countdown-progress"
              :style="{ width: `${(retryCountdown / autoRetryDelay) * 100}%` }"
            ></div>
          </div>
          <span class="countdown-text">{{ retryCountdown }}秒后自动重试...</span>
        </div>

        <div class="error-actions">
          <button @click="retry" class="btn btn-primary" :disabled="isRetrying">
            <span v-if="isRetrying" class="loading-spinner"></span>
            {{ isRetrying ? '重试中...' : '立即重试' }}
          </button>
          <button @click="reset" class="btn btn-secondary">返回首页</button>
        </div>

        <!-- 重试次数提示 -->
        <p v-if="retryCount > 0" class="retry-hint">
          已重试 {{ retryCount }} 次
        </p>
      </div>
    </div>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { logError } from '@/utils/errorHandler'

interface Props {
  autoRetry?: boolean
  autoRetryDelay?: number
  maxRetries?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRetry: true,
  autoRetryDelay: 5,
  maxRetries: 3,
})

const hasError = ref(false)
const errorMessage = ref('')
const errorType = ref<'network' | 'timeout' | 'server' | 'unknown'>('unknown')
const retryCount = ref(0)
const retryCountdown = ref(0)
const isRetrying = ref(false)
const router = useRouter()

let countdownTimer: ReturnType<typeof setInterval> | null = null

const autoRetryEnabled = computed(() =>
  props.autoRetry && retryCount.value < props.maxRetries
)

const errorIcon = computed(() => {
  switch (errorType.value) {
    case 'network': return '📡'
    case 'timeout': return '⏱️'
    case 'server': return '🔧'
    default: return '⚠️'
  }
})

const errorTitle = computed(() => {
  switch (errorType.value) {
    case 'network': return '网络连接失败'
    case 'timeout': return '请求超时'
    case 'server': return '服务器错误'
    default: return '出错了'
  }
})

function detectErrorType(error: unknown): 'network' | 'timeout' | 'server' | 'unknown' {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network'
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout'
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server'
    }
  }
  return 'unknown'
}

function startAutoRetryCountdown() {
  if (!autoRetryEnabled.value) return

  retryCountdown.value = props.autoRetryDelay

  countdownTimer = setInterval(() => {
    retryCountdown.value--
    if (retryCountdown.value <= 0) {
      stopCountdown()
      retry()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  retryCountdown.value = 0
}

onErrorCaptured((error) => {
  hasError.value = true
  errorMessage.value = error instanceof Error ? error.message : String(error)
  errorType.value = detectErrorType(error)
  logError(error, 'ErrorBoundary')

  // 启动自动重试倒计时
  startAutoRetryCountdown()

  return false
})

async function retry() {
  stopCountdown()
  isRetrying.value = true
  retryCount.value++

  // 模拟重试延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  hasError.value = false
  isRetrying.value = false

  // 刷新当前页面
  window.location.reload()
}

function reset() {
  stopCountdown()
  hasError.value = false
  retryCount.value = 0
  router.push('/')
}

onUnmounted(() => {
  stopCountdown()
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: var(--bg-primary, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
}

.error-content {
  background: var(--card-bg, white);
  border: 1px solid var(--card-border, transparent);
  border-radius: 1.5rem;
  padding: 2.5rem;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary, #333);
}

.error-message {
  color: var(--text-secondary, #666);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-size: 0.9rem;
}

/* 自动重试倒计时 */
.retry-countdown {
  margin-bottom: 1.5rem;
}

.countdown-bar {
  height: 4px;
  background: var(--bg-tertiary, #f0f0f0);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.countdown-progress {
  height: 100%;
  background: var(--color-primary, #f97316);
  transition: width 1s linear;
}

.countdown-text {
  font-size: 0.8rem;
  color: var(--text-tertiary, #999);
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary, #f97316);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--bg-tertiary, #f0f0f0);
  color: var(--text-secondary, #333);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary, #e0e0e0);
  transform: translateY(-2px);
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.retry-hint {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted, #999);
}
</style>
