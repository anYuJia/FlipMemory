<script setup lang="ts">
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const colorMap = {
  success: {
    bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
    icon: '#22c55e',
    text: '#22c55e',
  },
  error: {
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
    icon: '#ef4444',
    text: '#ef4444',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.1))',
    icon: '#f59e0b',
    text: '#f59e0b',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1))',
    icon: '#3b82f6',
    text: '#3b82f6',
  },
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none safe-area-top">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 -translate-y-4 scale-95"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl pointer-events-auto min-w-0 w-[min(320px,calc(100vw-2rem))] mx-auto"
          style="backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);"
          :style="{
            background: colorMap[toast.type].bg,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }"
        >
          <component 
            :is="iconMap[toast.type]" 
            class="w-5 h-5 flex-shrink-0"
            :style="{ color: colorMap[toast.type].icon }"
          />
          <span 
            class="flex-1 text-sm font-medium"
            style="color: var(--text-primary);"
          >
            {{ toast.message }}
          </span>
          <button 
            @click="remove(toast.id)"
            class="w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
          >
            <X class="w-4 h-4" style="color: var(--text-muted);" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
