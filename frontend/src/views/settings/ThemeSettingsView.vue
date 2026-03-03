<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { ArrowLeft, Check, Sparkles, Sun, Moon, Clock } from 'lucide-vue-next'
import { useTimeTheme } from '@/composables/useTimeTheme'

const router = useRouter()
const userStore = useUserStore()
const { allPalettes } = useTimeTheme()
const isLoaded = ref(false)

const lightPalettes = computed(() => allPalettes.filter(p => !p.isDark))
const darkPalettes = computed(() => allPalettes.filter(p => p.isDark))

const handleSelect = (id: string) => {
  userStore.setThemeColor(id)
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="router.back()" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90 shadow-sm">
          <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">个性化调色盘</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 space-y-10 pb-32 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      
      <!-- 时光流动 (Auto) -->
      <section>
        <div class="flex items-center gap-2 mb-4 opacity-40">
          <Clock class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">Flowing Mode</span>
        </div>
        <button 
          @click="handleSelect('auto')"
          class="w-full p-6 rounded-[2.5rem] card-static relative overflow-hidden transition-all active:scale-[0.98] group"
          :class="{ 'ring-4 ring-orange-500/40 shadow-2xl scale-[1.02]': userStore.themeColor === 'auto' }"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-purple-500/20 to-blue-500/20 opacity-40"></div>
          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg">
                <Sparkles class="w-6 h-6 text-orange-500" />
              </div>
              <div class="text-left">
                <div class="font-black tracking-tight" style="color: var(--text-primary);">时光流转</div>
                <div class="text-[10px] font-bold opacity-40 uppercase tracking-wider mt-0.5">Auto adaptive day & night</div>
              </div>
            </div>
            <div v-if="userStore.themeColor === 'auto'" class="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-inner">
              <Check class="w-3.5 h-3.5 text-white" stroke-width="4" />
            </div>
          </div>
        </button>
      </section>

      <!-- 亮色系 (Light Collection) -->
      <section>
        <div class="flex items-center gap-2 mb-4 opacity-40">
          <Sun class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">Light Tones</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <button 
            v-for="p in lightPalettes" 
            :key="p.id"
            @click="handleSelect(p.id)"
            class="p-5 rounded-[2.5rem] card-static flex flex-col items-center gap-4 transition-all active:scale-95"
            :class="{ 'ring-4 ring-orange-500/40 shadow-xl scale-105 bg-white/80': userStore.themeColor === p.id }"
          >
            <!-- 双色预览球 -->
            <div class="relative w-16 h-16">
              <div class="absolute inset-0 rounded-full border-2 border-white shadow-md overflow-hidden" :style="{ backgroundColor: p.bg }">
                <div class="absolute -right-2 -bottom-2 w-10 h-10 rounded-full" :style="{ backgroundColor: p.primary }"></div>
              </div>
            </div>
            <span class="text-[11px] font-black tracking-widest uppercase opacity-60" style="color: var(--text-primary);">{{ p.name }}</span>
          </button>
        </div>
      </section>

      <!-- 暗色系 (Dark Collection) -->
      <section>
        <div class="flex items-center gap-2 mb-4 opacity-40">
          <Moon class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">Dark Tones</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <button 
            v-for="p in darkPalettes" 
            :key="p.id"
            @click="handleSelect(p.id)"
            class="p-5 rounded-[2.5rem] card-static flex flex-col items-center gap-4 transition-all active:scale-95"
            :class="{ 'ring-4 ring-orange-500/40 shadow-xl scale-105 bg-black/40': userStore.themeColor === p.id }"
          >
            <div class="relative w-16 h-16">
              <div class="absolute inset-0 rounded-full border-2 border-white/10 shadow-lg overflow-hidden" :style="{ backgroundColor: p.bg }">
                <div class="absolute -right-2 -bottom-2 w-10 h-10 rounded-full" :style="{ backgroundColor: p.primary }"></div>
              </div>
            </div>
            <span class="text-[11px] font-black tracking-widest uppercase opacity-60" style="color: var(--text-primary);">{{ p.name }}</span>
          </button>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
