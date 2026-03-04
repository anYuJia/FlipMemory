<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check } from 'lucide-vue-next'
import { useUserStore } from '@/stores'

const router = useRouter()
const userStore = useUserStore()

const isLoaded = ref(true)

const options: Array<{ value: 0 | 1; label: string; description: string }> = [
  { value: 0, label: '周日', description: '以周日作为每周第一天' },
  { value: 1, label: '周一', description: '以周一作为每周第一天' },
]

const selectStartOfWeek = (value: 0 | 1) => {
  userStore.setStartOfWeek(value)
}

const goBack = () => {
  router.back()
}

onMounted(() => {})
</script>

<template>
  <div class="page-container">
    <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--glow-secondary);"
      />
    </div>
    
    <!-- 顶部导航 -->
    <header 
      class="sticky top-0 z-40 safe-area-top"
      style="background: rgba(var(--bg-primary-rgb), 0.9); backdrop-filter: blur(20px);"
    >
      <div class="max-w-lg mx-auto px-4 py-3">
        <div class="flex items-center gap-3">
          <button 
            @click="goBack"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
            style="background: var(--card-bg);"
          >
            <ArrowLeft class="w-5 h-5" style="color: var(--text-secondary);" />
          </button>
          <h1 class="text-lg font-semibold" style="color: var(--text-primary);">周起始日</h1>
        </div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <div class="relative max-w-lg mx-auto px-5 py-6">
      <p 
        class="text-sm mb-6"
        style="color: var(--text-tertiary);"
        :class="{ 'animate-fade-in': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        选择日历的周起始日
      </p>
      
      <!-- 选项 -->
      <div class="space-y-3">
        <button
          v-for="(option, index) in options"
          :key="option.value"
          @click="selectStartOfWeek(option.value as 0 | 1)"
          class="relative w-full p-4 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
          :class="{ 'animate-slide-up': isLoaded }"
          :style="{ 
            background: userStore.settings.startOfWeek === option.value 
              ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.08), rgba(249, 115, 22, 0.04))' 
              : 'var(--card-bg)',
            animationDelay: `${index * 50}ms`,
            opacity: isLoaded ? 1 : 0,
          }"
        >
          <!-- 左侧高亮条 -->
          <div 
            v-if="userStore.settings.startOfWeek === option.value"
            class="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style="background: linear-gradient(180deg, #fb923c, #f97316);"
          />
          
          <div class="flex items-center justify-between">
            <div class="text-left">
              <span 
                class="font-medium"
                :style="{ color: userStore.settings.startOfWeek === option.value ? 'var(--color-primary)' : 'var(--text-primary)' }"
              >
                {{ option.label }}
              </span>
              <p class="text-sm mt-0.5" style="color: var(--text-muted);">{{ option.description }}</p>
            </div>
            
            <!-- 选中标记 -->
            <Transition
              enter-active-class="transition-all duration-300"
              leave-active-class="transition-all duration-200"
              enter-from-class="opacity-0 scale-50"
              leave-to-class="opacity-0 scale-50"
            >
              <div 
                v-if="userStore.settings.startOfWeek === option.value"
                class="w-6 h-6 rounded-full flex items-center justify-center"
                style="background: linear-gradient(135deg, #fb923c, #f97316); box-shadow: 0 2px 8px rgba(251, 146, 60, 0.4);"
              >
                <Check class="w-4 h-4 text-white" />
              </div>
            </Transition>
          </div>
        </button>
      </div>
      
      <!-- 说明 -->
      <div 
        class="mt-6 p-4 rounded-xl"
        style="background: var(--bg-tertiary);"
        :class="{ 'animate-fade-in delay-200': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <p class="text-sm" style="color: var(--text-muted);">
          此设置将影响日历视图中每周的起始日。中国习惯使用周一，西方国家习惯使用周日。
        </p>
      </div>
    </div>
  </div>
</template>
