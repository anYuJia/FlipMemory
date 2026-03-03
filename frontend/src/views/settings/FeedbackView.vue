<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Send, MessageSquare, Sparkles, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const isLoaded = ref(false)
const isSubmitting = ref(false)
const isSuccess = ref(false)
const content = ref('')
const category = ref('suggestion')

const categories = [
  { id: 'suggestion', label: '建议', icon: Sparkles },
  { id: 'bug', label: '问题', icon: MessageSquare },
]

const handleSubmit = async () => {
  if (!content.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  
  // 模拟提交
  setTimeout(() => {
    isSubmitting.value = false
    isSuccess.value = true
    setTimeout(() => {
      router.back()
    }, 2000)
  }, 1200)
}

const goBack = () => router.back()

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.05]" style="background-color: var(--glow-primary);" />
    </div>

    <header class="sticky top-0 z-40 safe-area-top">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="goBack" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all card-static active:scale-90 shadow-sm">
          <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">反馈与建议</h1>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-4 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
      <div v-if="!isSuccess" class="space-y-8">
        <!-- 分类选择 -->
        <section>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 mb-4 block" style="color: var(--text-primary);">Select Category</span>
          <div class="flex gap-3">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              @click="category = cat.id"
              class="flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] transition-all border"
              :class="category === cat.id ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-xl scale-105' : 'card-static border-transparent opacity-40'"
            >
              <component :is="cat.icon" class="w-4 h-4" />
              <span class="text-sm font-bold">{{ cat.label }}</span>
            </button>
          </div>
        </section>

        <!-- 输入区域 -->
        <section>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 mb-4 block" style="color: var(--text-primary);">Your Message</span>
          <div class="rounded-[2.5rem] p-6 card-static shadow-inner min-h-[300px] flex flex-col">
            <textarea
              v-model="content"
              placeholder="告诉我们您的想法..."
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
          <span>{{ isSubmitting ? 'Sending...' : 'Send Feedback' }}</span>
        </button>
      </div>

      <!-- 成功状态 -->
      <div v-else class="py-20 flex flex-col items-center justify-center animate-scale-in">
        <div class="w-24 h-24 rounded-[2.5rem] bg-green-500 flex items-center justify-center shadow-2xl mb-8">
          <CheckCircle2 class="w-12 h-12 text-white" stroke-width="3" />
        </div>
        <h2 class="text-2xl font-black tracking-tighter mb-2" style="color: var(--text-primary);">感谢您的反馈</h2>
        <p class="text-sm font-medium opacity-40 text-center" style="color: var(--text-primary);">我们将不断精进，为您提供更好的体验。</p>
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
