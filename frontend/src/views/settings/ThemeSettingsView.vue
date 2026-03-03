<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Sun, Moon, Smartphone, Check } from 'lucide-vue-next'
import { useUserStore } from '@/stores'

const router = useRouter()
const userStore = useUserStore()

const isLoaded = ref(false)

const themes = [
  { 
    value: 'light' as const, 
    label: '浅色模式',
    description: '明亮清爽的视觉体验',
    icon: Sun,
    preview: {
      bg: '#ffffff',
      card: '#f9fafb',
      text: '#1f2937',
    }
  },
  { 
    value: 'dark' as const, 
    label: '深色模式', 
    description: '护眼舒适的夜间模式',
    icon: Moon,
    preview: {
      bg: '#0a0a0b',
      card: '#1a1a1d',
      text: '#f9fafb',
    }
  },
  { 
    value: 'system' as const, 
    label: '跟随系统', 
    description: '自动匹配系统主题设置',
    icon: Smartphone,
    preview: {
      bg: 'linear-gradient(135deg, #ffffff 50%, #0a0a0b 50%)',
      card: 'linear-gradient(135deg, #f9fafb 50%, #1a1a1d 50%)',
      text: '#6b7280',
    }
  },
]

const selectTheme = (theme: 'light' | 'dark' | 'system') => {
  userStore.setTheme(theme)
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
})
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
          <h1 class="text-lg font-semibold" style="color: var(--text-primary);">主题外观</h1>
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
        选择你喜欢的界面外观
      </p>
      
      <!-- 主题选项 -->
      <div class="space-y-3">
        <button
          v-for="(theme, index) in themes"
          :key="theme.value"
          @click="selectTheme(theme.value)"
          class="relative w-full p-4 rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
          :class="{ 'animate-slide-up': isLoaded }"
          :style="{ 
            background: userStore.theme === theme.value 
              ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.08), rgba(249, 115, 22, 0.04))' 
              : 'var(--card-bg)',
            animationDelay: `${index * 50}ms`,
            opacity: isLoaded ? 1 : 0,
          }"
        >
          <!-- 左侧高亮条 -->
          <div 
            v-if="userStore.theme === theme.value"
            class="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style="background: linear-gradient(180deg, #fb923c, #f97316);"
          />
          
          <div class="flex items-center gap-4">
            <!-- 预览图 -->
            <div 
              class="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0"
              :class="userStore.theme === theme.value ? 'ring-2 ring-orange-400/30' : 'ring-1 ring-black/5'"
              :style="{ background: theme.preview.bg }"
            >
              <div 
                class="m-1.5 h-2 w-8 rounded-full"
                :style="{ background: theme.preview.card }"
              />
              <div 
                class="m-1.5 h-1.5 w-6 rounded-full"
                :style="{ background: theme.preview.text, opacity: 0.5 }"
              />
            </div>
            
            <!-- 图标和文字 -->
            <div class="flex-1 text-left">
              <div class="flex items-center gap-2">
                <component 
                  :is="theme.icon" 
                  class="w-4 h-4" 
                  :style="{ color: userStore.theme === theme.value ? 'var(--color-primary)' : 'var(--text-secondary)' }"
                />
                <span 
                  class="font-medium"
                  :style="{ color: userStore.theme === theme.value ? 'var(--color-primary)' : 'var(--text-primary)' }"
                >
                  {{ theme.label }}
                </span>
              </div>
              <p class="text-sm mt-0.5" style="color: var(--text-muted);">{{ theme.description }}</p>
            </div>
            
            <!-- 选中标记 -->
            <Transition
              enter-active-class="transition-all duration-300"
              leave-active-class="transition-all duration-200"
              enter-from-class="opacity-0 scale-50"
              leave-to-class="opacity-0 scale-50"
            >
              <div 
                v-if="userStore.theme === theme.value"
                class="w-6 h-6 rounded-full flex items-center justify-center"
                style="background: linear-gradient(135deg, #fb923c, #f97316); box-shadow: 0 2px 8px rgba(251, 146, 60, 0.4);"
              >
                <Check class="w-4 h-4 text-white" />
              </div>
            </Transition>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
