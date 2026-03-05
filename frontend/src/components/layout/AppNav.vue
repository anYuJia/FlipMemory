<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
import { Home, Calendar, Sparkles, BarChart3, Settings } from 'lucide-vue-next'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'home', icon: Home, label: 'nav.home' },
  { name: 'calendar', icon: Calendar, label: 'nav.calendar' },
  { name: 'flashback', icon: Sparkles, label: 'nav.flashback' },
  { name: 'stats', icon: BarChart3, label: 'nav.stats' },
  { name: 'settings', icon: Settings, label: 'nav.settings' },
]

// 核心主页面名单
const mainPages = ['home', 'calendar', 'flashback', 'stats', 'settings']
const showNav = computed(() => mainPages.includes(route.name as string))

const isActive = (name: string) => route.name === name
const navigate = async (name: string) => {
  if (route.name === name) return
  
  // 触觉反馈
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (e) {
      // 忽略不支持的情况
    }
  }
  
  router.push({ name })
}

// 当前激活索引 (用于确定滑块位置)
const activeIndex = computed(() => {
  const idx = navItems.findIndex(item => item.name === route.name)
  return idx >= 0 ? idx : 0
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="translate-y-20 opacity-0"
    leave-to-class="translate-y-20 opacity-0"
  >
    <nav v-if="showNav" role="navigation" aria-label="Main navigation" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-md:w-[calc(100%-2rem)] max-w-md pb-[env(safe-area-inset-bottom)]">
      <!-- 1. 统一导航底色背景 -->
      <div class="absolute inset-0 rounded-[2.2rem] shadow-2xl backdrop-blur-3xl saturate-[180%] border border-white/10 dark:border-white/5" style="background: var(--nav-bg);" />
      
      <div class="relative flex items-center h-20 px-1.5 overflow-hidden">
        
        <!-- 2. 核心：绝对定位的指示器，通过 activeIndex 驱动 -->
        <!-- 我们将宽度设为 100% / 5，完全不使用 Padding 偏移，确保数学对称 -->
        <div
          class="absolute inset-y-0 left-0 transition-transform duration-500 cubic-bezier pointer-events-none"
          :style="{ 
            width: `${100 / navItems.length}%`,
            transform: `translateX(${activeIndex * 100}%)` 
          }"
        >
          <div class="h-full w-full flex items-center justify-center">
            <!-- 高亮方块：使用 scale 动画增加动感 -->
            <div class="w-[88%] h-[72%] rounded-2xl bg-orange-400/10 dark:bg-orange-400/5 border border-orange-400/10" />
            <!-- 底部小点 -->
            <div class="absolute bottom-3 w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,1)]" />
          </div>
        </div>

        <!-- 3. 按钮层：覆盖在滑块上方 -->
        <button
          v-for="item in navItems"
          :key="item.name"
          @click="navigate(item.name)"
          role="tab"
          :aria-selected="isActive(item.name)"
          :aria-label="$t(item.label)"
          class="relative flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 group z-10"
        >
          <div class="relative transition-transform duration-300 group-hover:-translate-y-1">
            <component 
              :is="item.icon" 
              class="w-5.5 h-5.5 transition-all duration-500" 
              :stroke-width="isActive(item.name) ? 2.5 : 2" 
              :style="{ 
                color: isActive(item.name) ? 'var(--color-primary)' : 'var(--text-tertiary)', 
                filter: isActive(item.name) ? 'drop-shadow(0 4px 8px rgba(251, 146, 60, 0.3))' : 'none' 
              }" 
            />
          </div>
          <span 
            class="text-[9px] font-black uppercase tracking-[0.1em] mt-1.5 transition-all duration-300" 
            :style="{ 
              color: isActive(item.name) ? 'var(--color-primary)' : 'var(--text-tertiary)', 
              opacity: isActive(item.name) ? '1' : '0.4' 
            }"
          >
            {{ $t(item.label) }}
          </span>
        </button>
      </div>
    </nav>
  </Transition>
</template>

<style scoped>
.cubic-bezier {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

/* 确保在移动端点击时没有自带的高亮色 */
button {
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
</style>
