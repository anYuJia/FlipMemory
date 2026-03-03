<script setup lang="ts">
import { User, Bell } from 'lucide-vue-next'

interface Props {
  title?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'FlipMemory',
  showBack: false,
})
</script>

<template>
  <header class="sticky top-0 z-40 glass safe-area-top">
    <div class="max-w-lg mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- 左侧 -->
        <div class="flex items-center gap-3">
          <slot name="left">
            <h1 class="text-xl font-bold text-gradient">
              {{ title }}
            </h1>
          </slot>
        </div>
        
        <!-- 右侧 -->
        <div class="flex items-center gap-2">
          <slot name="right">
            <button class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell class="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <button class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User class="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </button>
          </slot>
        </div>
      </div>
    </div>
  </header>
</template>
