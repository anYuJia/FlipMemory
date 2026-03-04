<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Send, MessageSquare, Sparkles, CheckCircle2, Loader2, Info } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const isLoaded = ref(true)
const isSubmitting = ref(false)
const isSuccess = ref(false)
const content = ref('')
const category = ref('feature')

// 动态分类标签
const categories = computed(() => [
  { id: 'feature', label: t('feedback.types.feature'), icon: Sparkles },
  { id: 'bug', label: t('feedback.types.bug'), icon: MessageSquare },
  { id: 'other', label: t('feedback.types.other'), icon: Info },
])

const handleSubmit = async () => {
  if (!content.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  
  // 模拟提交
  setTimeout(() => {
    isSubmitting.value = false
    isSuccess.value = true
    setTimeout(() => {
      router.back()
    }, 2500)
  }, 1200)
}

const goBack = () => router.back()

onMounted(() => {})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.05]" style="background-color: var(--glow-primary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="goBack" class="btn-back">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ $t('feedback.title') }}</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      <div v-if="!isSuccess" class="space-y-8">
        <!-- 分类选择 -->
        <section>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 mb-4 block" style="color: var(--text-primary);">{{ $t('feedback.type_label') }}</span>
          <div class="grid grid-cols-3 gap-3">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              @click="category = cat.id"
              class="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all border-2"
              :style="{ 
                borderColor: category === cat.id ? 'var(--color-primary)' : 'transparent',
                backgroundColor: category === cat.id ? 'var(--card-bg)' : 'rgba(0,0,0,0.03)'
              }"
              :class="category === cat.id ? 'shadow-xl scale-105 opacity-100' : 'opacity-40'"
            >
              <component :is="cat.icon" class="w-5 h-5" :style="{ color: category === cat.id ? 'var(--color-primary)' : 'var(--text-primary)' }" />
              <span class="text-[10px] font-black uppercase tracking-wider" :style="{ color: category === cat.id ? 'var(--color-primary)' : 'var(--text-primary)' }">{{ cat.label }}</span>
            </button>
          </div>
        </section>

        <!-- 输入区域 -->
        <section>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 mb-4 block" style="color: var(--text-primary);">Message</span>
          <div class="rounded-[2.5rem] p-6 card-static shadow-inner min-h-[280px] flex flex-col">
            <textarea
              v-model="content"
              :placeholder="$t('feedback.content_placeholder')"
              class="flex-1 w-full bg-transparent border-none focus:outline-none text-base font-medium leading-relaxed placeholder:opacity-20"
              style="color: var(--text-primary);"
            ></textarea>
          </div>
        </section>

        <!-- 提交按钮 -->
        <button 
          @click="handleSubmit"
          :disabled="!content.trim() || isSubmitting"
          class="w-full py-5 rounded-[2rem] text-white font-black text-[11px] uppercase tracking-[0.25em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-20"
          style="background: var(--gradient-accent);"
        >
          <Send v-if="!isSubmitting" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? $t('common.loading') : $t('feedback.submit') }}</span>
        </button>
      </div>

      <!-- 成功状态 -->
      <div v-else class="py-20 flex flex-col items-center justify-center animate-scale-in">
        <div class="w-24 h-24 rounded-[3rem] flex items-center justify-center shadow-2xl mb-10" style="background: var(--gradient-accent);">
          <CheckCircle2 class="w-12 h-12 text-white" stroke-width="3" />
        </div>
        <h2 class="text-2xl font-black tracking-tighter mb-2" style="color: var(--text-primary);">{{ $t('feedback.success_title') }}</h2>
        <p class="text-sm font-medium opacity-40 text-center max-w-[240px] leading-relaxed" style="color: var(--text-primary);">{{ $t('feedback.success_msg') }}</p>
      </div>
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
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
</style>
