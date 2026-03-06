<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { ArrowLeft, Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const router = useRouter()
const userStore = useUserStore()
const { t, locale } = useI18n()
const isLoaded = ref(true)

const languages = ['zh-CN', 'zh-TW', 'ja', 'en']

const nativeNames: Record<string, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ja': '日本語',
  'en': 'English',
}

const handleSelect = (key: string) => {
  userStore.setLocale(key)
}

</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.05]" style="background-color: var(--glow-primary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="router.back()" class="btn-back">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('settings.language_title') }}</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      <div class="rounded-[2.5rem] overflow-hidden card-static shadow-xl">
        <button
          v-for="lang in languages"
          :key="lang"
          @click="handleSelect(lang)"
          class="w-full flex items-center justify-between px-8 py-6 transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
        >
          <span class="text-base font-bold tracking-tight" :class="locale === lang ? 'text-orange-500' : ''" style="color: var(--text-primary);">
            {{ nativeNames[lang] || lang }}
          </span>
          <div v-if="locale === lang" class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg animate-scale-in">
            <Check class="w-4 h-4 text-white" stroke-width="4" />
          </div>
        </button>
      </div>
      
      <p class="mt-8 px-4 text-xs font-medium opacity-30 text-center leading-relaxed" style="color: var(--text-primary);">
        {{ $t('settings.language_desc') }}
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
