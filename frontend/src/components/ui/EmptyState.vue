<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
  actionText?: string
  variant?: 'default' | 'compact'
}>(), {
  variant: 'default',
})

const emit = defineEmits<{
  action: []
}>()

const iconSize = computed(() => {
  return props.variant === 'compact' ? 'w-14 h-14 text-3xl rounded-2xl' : 'w-20 h-20 text-4xl rounded-3xl'
})

const titleSize = computed(() => {
  return props.variant === 'compact' ? 'text-sm' : 'text-base'
})
</script>

<template>
  <div 
    class="flex flex-col items-center justify-center text-center"
    :class="variant === 'compact' ? 'py-8' : 'py-16'"
  >
    <!-- 图标 -->
    <div 
      :class="iconSize"
      class="mx-auto mb-4 flex items-center justify-center"
      style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(249, 115, 22, 0.05));"
    >
      {{ icon || '📭' }}
    </div>
    
    <!-- 标题 -->
    <h3 
      :class="titleSize"
      class="font-semibold mb-1"
      style="color: var(--text-primary);"
    >
      {{ title }}
    </h3>
    
    <!-- 描述 -->
    <p 
      v-if="description"
      class="text-sm mb-5"
      style="color: var(--text-muted);"
    >
      {{ description }}
    </p>
    
    <!-- 操作按钮 -->
    <button 
      v-if="actionText"
      @click="emit('action')"
      class="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
      style="background: linear-gradient(135deg, #fb923c, #f97316); box-shadow: 0 4px 16px rgba(251, 146, 60, 0.3);"
    >
      {{ actionText }}
    </button>
  </div>
</template>
