<script setup lang="ts">
import { ref, onErrorCaptured, onBeforeUnmount } from 'vue'
import { AlertCircle, RefreshCw, Home } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const error = ref<any>(null)
const isRetrying = ref(false)
const retryCount = ref(0)
const retryCountdown = ref(0)
let retryTimerId: ReturnType<typeof setInterval> | null = null

onErrorCaptured((err) => {
  error.value = err
  startRetryTimer()
  return false
})

const startRetryTimer = () => {
  if (retryTimerId) clearInterval(retryTimerId)
  retryCountdown.value = 5
  retryTimerId = setInterval(() => {
    retryCountdown.value--
    if (retryCountdown.value <= 0) {
      if (retryTimerId) { clearInterval(retryTimerId); retryTimerId = null }
      if (retryCount.value < 3) handleRetry()
    }
  }, 1000)
}

const handleRetry = () => {
  isRetrying.value = true
  retryCount.value++
  setTimeout(() => {
    error.value = null
    isRetrying.value = false
  }, 500)
}

const reset = () => {
  error.value = null
  router.push('/')
}

const getErrorMessage = (err: any) => {
  if (err?.name === 'NetworkError') return t('common.network_error')
  if (err?.name === 'TimeoutError') return t('common.timeout_error')
  return t('common.error_occurred')
}

onBeforeUnmount(() => {
  if (retryTimerId) { clearInterval(retryTimerId); retryTimerId = null }
})
</script>

<template>
  <slot v-if="!error"></slot>
  <div v-else class="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
    <div class="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center mb-8 animate-bounce">
      <AlertCircle class="w-10 h-10 text-red-500" />
    </div>
    
    <h2 class="text-2xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">
      {{ getErrorMessage(error) }}
    </h2>
    
    <div class="mb-10 space-y-4">
      <p class="text-sm font-medium opacity-40 text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
        {{ error.message || t('common.error_occurred') }}
      </p>
      
      <!-- 自动重试倒计时 -->
      <div v-if="retryCountdown > 0 && retryCount < 3" class="px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 inline-block">
        <span class="text-[10px] font-black uppercase tracking-widest opacity-60">
          {{ t('common.retry_countdown', { seconds: retryCountdown }) }}
        </span>
      </div>
    </div>

    <div class="flex flex-col w-full max-w-xs gap-3">
      <button @click="handleRetry" :disabled="isRetrying" class="w-full py-4 rounded-2xl bg-orange-500 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRetrying }" />
        {{ isRetrying ? t('common.retrying') : t('common.retry') }}
      </button>
      
      <button @click="reset" class="w-full py-4 rounded-2xl bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
        <Home class="w-4 h-4" />
        {{ t('common.return_home') }}
      </button>
    </div>
  </div>
</template>
