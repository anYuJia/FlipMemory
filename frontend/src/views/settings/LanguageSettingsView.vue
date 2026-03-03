<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { ArrowLeft, Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const isLoaded = ref(false)

const languages = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' }
]

const handleSelect = (key: string) => {
  userStore.setLocale(key)
}

const goBack = () => router.back()

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.05]" style="background-color: var(--glow-primary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="goBack" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90">
          <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('settings.language_title') }}</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      <div class="rounded-[2.5rem] overflow-hidden card-static shadow-xl">
        <button
          v-for="(lang, index) in languages"
          :key="lang.key"
          @click="handleSelect(lang.key)"
          class="w-full flex items-center justify-between px-8 py-6 transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
        >
          <span class="text-base font-bold tracking-tight" :class="locale === lang.key ? 'text-orange-500' : ''" style="color: var(--text-primary);">
            {{ lang.label }}
          </span>
          <div v-if="locale === lang.key" class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg animate-scale-in">
            <Check class="w-4 h-4 text-white" stroke-width="4" />
          </div>
        </button>
        <div v-if="index !== languages.length - 1" class="mx-8 h-px bg-black/[0.03] dark:bg-white/[0.05]"></div>
      </div>
      
      <p class="mt-8 px-4 text-xs font-medium opacity-30 text-center leading-relaxed" style="color: var(--text-primary);">
        选择您的首选语言，应用将自动刷新以应用更改。
      </p>
    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
</style>
