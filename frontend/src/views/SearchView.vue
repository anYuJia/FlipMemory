<script lang="ts">
export default {
  name: 'SearchView'
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onActivated, onDeactivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, ArrowLeft, TrendingUp, Sun, Cloud, Loader2, XCircle, CheckCircle2 } from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { sanitizeText } from '@/utils/xssSecurity'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const memoryStore = useMemoryStore()
const { t } = useI18n()

const isLoaded = ref(false)
const hasAnimated = ref(false)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const scrollY = ref(0)

const weatherIcons: Record<string, any> = { sunny: Sun, cloudy: Cloud }

watch(searchQuery, (newVal) => {
  const timeout = setTimeout(() => { debouncedSearchQuery.value = newVal }, 300)
  return () => clearTimeout(timeout)
})

const searchHistory = ref<string[]>(JSON.parse(localStorage.getItem('searchHistory') || '[]'))
const hotTags = ['开心', '旅行', '美食', '工作', '周末', '朋友']

const searchResults = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase()
  if (!query) return []
  const results: any[] = []
  const memories = Array.from(memoryStore.memories.entries())
  for (const [date, memory] of memories) {
    if (memory.content?.toLowerCase().includes(query) || date.includes(query)) {
      results.push({
        date,
        content: memory.content,
        mood: memory.mood,
        photoUrl: memory.photos?.[0]?.thumbnailUrl || memory.photos?.[0]?.originalUrl
      })
      if (results.length >= 50) break
    }
  }
  return results
})

const doSearch = () => {
  if (searchQuery.value.trim()) {
    debouncedSearchQuery.value = searchQuery.value
    saveToHistory(searchQuery.value)
  }
}

const saveToHistory = (query: string) => {
  const history = [query, ...searchHistory.value.filter(h => h !== query)].slice(0, 10)
  searchHistory.value = history
  localStorage.setItem('searchHistory', JSON.stringify(history))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

const useHistory = (query: string) => {
  searchQuery.value = query
  debouncedSearchQuery.value = query
}

const clearSearch = () => {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  searchInputRef.value?.focus()
}

const viewMemory = (date: string) => router.push({ name: 'memory-detail', params: { date } })
const goBack = () => router.back()

const highlightMatch = (text: string, query: string) => {
  if (!query) return sanitizeText(text)
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return sanitizeText(text).replace(regex, '<mark class="bg-orange-400/30 text-orange-600 dark:text-orange-400 rounded px-0.5">$1</mark>')
}

const truncateText = (text: string, length = 100) => text.length > length ? text.substring(0, length) + '...' : text
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
  nextTick(() => searchInputRef.value?.focus())
})
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.1] bg-orange-400" />
    </div>
    
    <header class="sticky top-0 z-40 safe-area-top pt-6 pb-4 px-6">
      <div class="max-w-lg mx-auto">
        <div class="flex items-center gap-3 p-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-lg transition-all" :class="{ 'ring-4 ring-orange-400/20 scale-[1.02]': isFocused }">
          <button @click="goBack" class="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95">
            <ArrowLeft class="w-5 h-5 opacity-40" style="color: var(--text-primary);" />
          </button>
          
          <div class="flex-1 flex items-center gap-3 pr-2">
            <input ref="searchInputRef" v-model="searchQuery" @focus="isFocused = true" @blur="isFocused = false" @keyup.enter="doSearch" type="text" :placeholder="$t('search.placeholder')" class="flex-1 bg-transparent border-none outline-none text-base font-medium placeholder:opacity-30" style="color: var(--text-primary);" />
            <button v-if="searchQuery" @click="clearSearch" class="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all">
              <X class="w-4 h-4 opacity-40" style="color: var(--text-primary);" />
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main class="relative max-w-lg mx-auto px-6">
      <div v-if="!searchQuery" class="pt-6 transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0 }">
        <section v-if="searchHistory.length > 0" class="mb-10">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ $t('search.recent_searches') }}</span>
            <button @click="clearHistory" class="text-[10px] font-bold tracking-widest uppercase text-red-400 opacity-60 hover:opacity-100 transition-opacity">Clear</button>
          </div>
          <div class="flex flex-wrap gap-2.5">
            <button v-for="history in searchHistory" :key="history" @click="useHistory(history)" class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm opacity-60 hover:opacity-100 active:scale-95" style="color: var(--text-primary);">{{ history }}</button>
          </div>
        </section>
        
        <section>
          <div class="flex items-center gap-2 mb-4">
            <TrendingUp class="w-4 h-4 text-orange-400 opacity-60" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30" style="color: var(--text-primary);">{{ $t('search.trending') }}</span>
          </div>
          <div class="flex flex-wrap gap-2.5">
            <button v-for="tag in hotTags" :key="tag" @click="useHistory(tag)" class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all bg-orange-50/50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-600/70 hover:text-orange-600 active:scale-95">{{ tag }}</button>
          </div>
        </section>
      </div>
      
      <div v-else class="pt-6">
        <div class="flex items-center gap-2 mb-8">
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ $t('search.found') }}</span>
          <span class="text-xl font-black tracking-tighter text-gradient">{{ searchResults.length }}</span>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40" style="color: var(--text-primary);">{{ $t('search.memories_count') }}</span>
        </div>
        
        <div class="space-y-4 pb-32">
          <div v-for="(result, index) in searchResults" :key="result.date" @click="viewMemory(result.date)" class="group relative p-5 rounded-[2rem] cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] card-static overflow-hidden shadow-sm" :style="{ animationDelay: `${index * 40}ms` }">
            <div class="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div class="relative flex gap-5 items-center">
              <div class="flex-shrink-0">
                <img v-if="result.photoUrl" :src="result.photoUrl" class="w-16 h-16 rounded-[1.25rem] object-cover shadow-md" />
                <div v-else class="w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl bg-black/5 dark:bg-white/5 shadow-inner">{{ result.mood ? MoodEmoji[result.mood as MoodType] : '📝' }}</div>
              </div>
              <div class="flex-1 min-w-0 py-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-[10px] font-black tracking-widest uppercase opacity-40" style="color: var(--text-primary);">{{ formatDate(result.date) }}</span>
                  <div class="flex items-center gap-1.5 opacity-60">
                    <span v-if="result.mood" class="text-xs">{{ MoodEmoji[result.mood as MoodType] }}</span>
                  </div>
                </div>
                <p class="text-sm font-medium leading-relaxed opacity-80 line-clamp-2" style="color: var(--text-primary);" v-html="highlightMatch(truncateText(result.content || '...'), searchQuery)" />
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="searchResults.length === 0" class="flex flex-col items-center justify-center py-20">
          <div class="relative w-32 h-32 mb-8">
            <div class="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-full blur-[40px] opacity-50" />
            <div class="relative w-full h-full rounded-full border border-black/5 dark:border-white/10 flex items-center justify-center bg-white/50 dark:bg-white/5 backdrop-blur-md">
              <Search class="w-10 h-10 opacity-20" style="color: var(--text-primary);" />
            </div>
          </div>
          <h3 class="text-xl font-black tracking-tight mb-2" style="color: var(--text-primary);">{{ $t('search.no_results') }}</h3>
          <p class="text-[10px] font-black opacity-40 tracking-[0.2em] uppercase text-center max-w-[200px] leading-relaxed" style="color: var(--text-primary);">{{ $t('search.no_results_sub', { query: searchQuery }) }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(24px) saturate(180%);
}
</style>
