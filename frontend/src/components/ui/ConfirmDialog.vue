<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Trash2, Info } from 'lucide-vue-next'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  type: 'info',
})

let resolvePromise: ((value: boolean) => void) | null = null

const open = (opts: ConfirmOptions): Promise<boolean> => {
  options.value = {
    confirmText: '确定',
    cancelText: '取消',
    type: 'info',
    ...opts,
  }
  isOpen.value = true
  
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const confirm = () => {
  isOpen.value = false
  resolvePromise?.(true)
  resolvePromise = null
}

const cancel = () => {
  isOpen.value = false
  resolvePromise?.(false)
  resolvePromise = null
}

const iconMap = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
}

const iconColorMap = {
  danger: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' },
}

const confirmButtonStyle = {
  danger: 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;',
  warning: 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;',
  info: 'background: linear-gradient(135deg, #fb923c, #f97316); color: white;',
}

defineExpose({ open })
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
        class="fixed inset-0 z-[9998] flex items-center justify-center p-5"
        @click.self="cancel"
      >
        <!-- 背景遮罩 -->
        <div 
          class="absolute inset-0"
          style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
        />
        
        <!-- 弹窗内容 -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div 
            v-if="isOpen"
            class="relative w-full max-w-[320px] p-6 rounded-3xl"
            style="background: var(--card-bg); box-shadow: 0 20px 60px rgba(0,0,0,0.3);"
          >
            <!-- 图标 -->
            <div 
              class="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              :style="{ background: iconColorMap[options.type || 'info'].bg }"
            >
              <component 
                :is="iconMap[options.type || 'info']"
                class="w-7 h-7"
                :style="{ color: iconColorMap[options.type || 'info'].color }"
              />
            </div>
            
            <!-- 标题 -->
            <h3 
              class="text-lg font-bold text-center mb-2"
              style="color: var(--text-primary);"
            >
              {{ options.title }}
            </h3>
            
            <!-- 消息 -->
            <p 
              class="text-sm text-center mb-6 leading-relaxed"
              style="color: var(--text-tertiary);"
            >
              {{ options.message }}
            </p>
            
            <!-- 按钮 -->
            <div class="flex gap-3">
              <button
                @click="cancel"
                class="flex-1 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style="background: var(--bg-tertiary); color: var(--text-secondary);"
              >
                {{ options.cancelText }}
              </button>
              <button
                @click="confirm"
                class="flex-1 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                :style="confirmButtonStyle[options.type || 'info']"
              >
                {{ options.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
