<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { ArrowLeft, Check, Sparkles, Clock, Palette, History } from 'lucide-vue-next'
import { useTimeTheme } from '@/composables/useTimeTheme'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { allPalettes } = useTimeTheme()
const { t } = useI18n()
const isLoaded = ref(false)

/**
 * 核心逻辑：
 * savedValues: 上次点击“保存”或“应用”后的正式颜色，作为脏检查的基准。
 * tempValues: 取色器当前显示的颜色（草稿）。
 */
const savedPrimary = ref(userStore.customColors.primary)
const savedBg = ref(userStore.customColors.bg)

const tempPrimary = ref(userStore.customColors.primary)
const tempBg = ref(userStore.customColors.bg)

// 脏检查
const isDirty = computed(() => {
  return tempPrimary.value.toLowerCase() !== savedPrimary.value.toLowerCase() || 
         tempBg.value.toLowerCase() !== savedBg.value.toLowerCase()
})

// 监听 Store 变化（仅当由外部如历史记录触发时同步基准）
watch(() => userStore.customColors, (newVal) => {
  tempPrimary.value = newVal.primary
  tempBg.value = newVal.bg
  savedPrimary.value = newVal.primary
  savedBg.value = newVal.bg
}, { deep: true })

const handleSelect = (id: string) => {
  userStore.setThemeColor(id)
}

// 实时预览
const onColorInput = () => {
  if (userStore.themeColor !== 'custom') {
    userStore.setThemeColor('custom')
  }
  userStore.updateCustomColors(tempPrimary.value, tempBg.value)
}

// 确认保存
const saveCustom = () => {
  userStore.setCustomColors(tempPrimary.value, tempBg.value)
  savedPrimary.value = tempPrimary.value
  savedBg.value = tempBg.value
}

// 放弃修改
const cancelEdit = () => {
  tempPrimary.value = savedPrimary.value
  tempBg.value = savedBg.value
  userStore.updateCustomColors(tempPrimary.value, tempBg.value)
}

const applyFromHistory = (h: {primary: string, bg: string}) => {
  userStore.setCustomColors(h.primary, h.bg)
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden pb-20">
    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="router.back()" class="btn-back">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('settings.theme.title') }}</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 space-y-10 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      
      <!-- 1. 自动流转 -->
      <section>
        <div class="flex items-center gap-2 mb-4 opacity-40" style="color: var(--text-primary);">
          <Clock class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.theme.auto_mode') }}</span>
        </div>
        <button @click="handleSelect('auto')" class="w-full p-5 rounded-[2rem] card-static relative overflow-hidden transition-all active:scale-[0.98] border-2" :style="{ borderColor: userStore.themeColor === 'auto' ? 'var(--color-primary)' : 'transparent' }" :class="{ 'shadow-xl': userStore.themeColor === 'auto' }">
          <div class="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-purple-500/20 to-blue-500/20 opacity-30"></div>
          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-lg"><Sparkles class="w-5 h-5 text-orange-500" /></div>
              <div class="text-left">
                <div class="font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.theme.auto_mode') }}</div>
                <div class="text-[9px] font-bold opacity-40 uppercase tracking-wider mt-0.5" style="color: var(--text-primary);">{{ t('settings.theme.auto_desc') }}</div>
              </div>
            </div>
            <div v-if="userStore.themeColor === 'auto'" class="w-6 h-6 rounded-full flex items-center justify-center shadow-inner" style="background-color: var(--color-primary);"><Check class="w-3.5 h-3.5 text-white" stroke-width="4" /></div>
          </div>
        </button>
      </section>

      <!-- 2. 预设库 -->
      <section class="space-y-6">
        <div class="flex items-center gap-2 mb-2 opacity-40" style="color: var(--text-primary);">
          <Palette class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.theme.library') }}</span>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <button v-for="p in allPalettes" :key="p.id" @click="handleSelect(p.id)" class="aspect-square rounded-2xl card-static flex flex-col items-center justify-center gap-2 transition-all active:scale-90 border-2" :style="{ borderColor: userStore.themeColor === p.id ? 'var(--color-primary)' : 'transparent' }">
            <div class="w-9 h-9 rounded-full border border-white/20 shadow-sm relative overflow-hidden" :style="{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.bg} 50%)` }"></div>
            <span class="text-[8px] font-black tracking-widest uppercase opacity-60" style="color: var(--text-primary);">{{ t(`settings.theme.palettes.${p.id}`) }}</span>
          </button>
        </div>
      </section>

      <!-- 3. 自定义实验室 -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2 opacity-40" style="color: var(--text-primary);">
            <Sparkles class="w-4 h-4" />
            <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.theme.custom_lab') }}</span>
          </div>
          <div v-if="isDirty" class="px-2 py-0.5 rounded-full bg-orange-500 text-[8px] font-black text-white uppercase animate-pulse shadow-sm">
            {{ t('settings.theme.lab_preview') }}
          </div>
        </div>
        
        <div class="rounded-[2.5rem] card-static border-2 transition-all overflow-hidden" :style="{ borderColor: userStore.themeColor === 'custom' ? 'var(--color-primary)' : 'transparent' }">
          <div class="p-6 pb-2">
            <div class="flex items-center justify-center gap-12">
              <div class="flex flex-col items-center gap-3">
                <div class="relative w-12 h-12 rounded-full border-4 border-white/30 shadow-xl overflow-hidden cursor-pointer" :style="{ backgroundColor: tempPrimary }">
                  <input type="color" v-model="tempPrimary" @input="onColorInput" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                </div>
                <span class="text-[9px] font-black uppercase tracking-widest opacity-40">{{ t('settings.theme.primary') }}</span>
              </div>
              <div class="flex flex-col items-center gap-3">
                <div class="relative w-12 h-12 rounded-full border-4 border-white/30 shadow-xl overflow-hidden cursor-pointer" :style="{ backgroundColor: tempBg }">
                  <input type="color" v-model="tempBg" @input="onColorInput" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" />
                </div>
                <span class="text-[9px] font-black uppercase tracking-widest opacity-40">{{ t('settings.theme.background') }}</span>
              </div>
            </div>
          </div>
          
          <div class="p-8 pt-6 flex flex-col gap-4">
            <div class="flex gap-4">
              <button @click="cancelEdit" class="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-black/5 dark:bg-white/10" :class="isDirty ? 'opacity-100 active:scale-95' : 'opacity-10 pointer-events-none'" style="color: var(--text-primary);">
                {{ t('settings.theme.reset') }}
              </button>
              <button @click="saveCustom" class="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-orange-500 text-white shadow-xl shadow-orange-500/30" :class="isDirty ? 'opacity-100 active:scale-95' : 'opacity-10 pointer-events-none grayscale'">
                {{ t('settings.theme.save_apply') }}
              </button>
            </div>
            
            <button v-if="userStore.themeColor !== 'custom'" @click="handleSelect('custom')" class="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black active:scale-95 shadow-lg">
              {{ t('settings.theme.activate') }}
            </button>
            <div v-else class="text-center py-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style="color: var(--text-primary);">
              {{ t('settings.theme.active') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 4. 历史记录 -->
      <section v-if="userStore.colorHistory.length > 0">
        <div class="flex items-center gap-2 mb-4 opacity-40" style="color: var(--text-primary);">
          <History class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">Color History</span>
        </div>
        <TransitionGroup name="history-list" tag="div" class="grid grid-cols-4 gap-3">
          <button v-for="h in userStore.colorHistory" :key="h.primary + h.bg" @click="applyFromHistory(h)" class="aspect-square rounded-2xl card-static flex items-center justify-center transition-all active:scale-90 border-2" :style="{ borderColor: (userStore.themeColor === 'custom' && userStore.customColors.primary === h.primary && userStore.customColors.bg === h.bg) ? 'var(--color-primary)' : 'transparent' }">
            <div class="w-10 h-10 rounded-full border border-white/20 shadow-md relative overflow-hidden" :style="{ background: `linear-gradient(135deg, ${h.primary} 50%, ${h.bg} 50%)` }"></div>
          </button>
        </TransitionGroup>
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

.history-list-enter-active, .history-list-leave-active, .history-list-move {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.history-list-enter-from { opacity: 0; transform: scale(0.5) translateY(-20px); }
.history-list-leave-to { opacity: 0; transform: scale(0.5); }
</style>
