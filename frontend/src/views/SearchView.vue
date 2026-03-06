<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { safeBack } from '@/router'
import { Search, X, ArrowLeft, TrendingUp, History, Sparkles } from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { escapeHtml } from '@/utils/xssSecurity'
import { useI18n } from 'vue-i18n'

defineOptions({
  name: 'SearchView'
})

const router = useRouter()
const memoryStore = useMemoryStore()
const { t, locale } = useI18n()

// 状态
const isLoaded = ref(false)
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const isSearching = ref(false)

// 模拟搜索延迟动画
watch(searchQuery, (newVal, _oldVal, onCleanup) => {
  isSearching.value = true
  const timeout = setTimeout(() => {
    debouncedSearchQuery.value = newVal
    isSearching.value = false
  }, 300)
  onCleanup(() => clearTimeout(timeout))
})

const searchHistory = ref<string[]>(JSON.parse(localStorage.getItem('searchHistory') || '[]'))
const hotTags = computed(() => [
  t('search.hot_tags.happy'),
  t('search.hot_tags.travel'),
  t('search.hot_tags.food'),
  t('search.hot_tags.work'),
  t('search.hot_tags.weekend'),
  t('search.hot_tags.friends')
])

const searchResults = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase()
  if (!query) return []
  const results: any[] = []

  const memoriesMap = (memoryStore.memories as unknown) as Map<string, any>

  for (const [date, memory] of memoriesMap) {
    if (date.includes(query) || memory.content?.toLowerCase().includes(query)) {
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
    searchInputRef.value?.blur()
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
  doSearch()
}

const clearSearch = () => {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  searchInputRef.value?.focus()
}

const viewMemory = (date: string) => router.push({ name: 'memory-detail', params: { date } })
const goBack = () => safeBack()

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}

const highlightMatch = (text: string, query: string) => {
  const safe = escapeHtml(text)
  if (!query) return safe
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return safe.replace(regex, '<mark class="search-highlight">$1</mark>')
}

const truncateText = (text: string, length = 80) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

onMounted(() => {
  setTimeout(() => { 
    isLoaded.value = true 
    searchInputRef.value?.focus()
  }, 100)
})
</script>

<template>
  <div class="page-container page-enter pb-32">
    <!-- 顶部固定搜索栏：紧凑胶囊 -->
    <header class="sticky top-0 z-50 safe-area-top pt-6 pb-4 px-6 backdrop-blur-2xl">
      <div class="max-w-lg mx-auto">
        <div 
          class="flex items-center gap-2 p-1.5 rounded-2xl transition-all duration-500 relative overflow-hidden"
          :class="[
            isFocused ? 'bg-white dark:bg-white/10 shadow-lg scale-[1.01]' : 'bg-black/[0.03] dark:bg-white/5 shadow-sm'
          ]"
        >
          <button @click="goBack" class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <ArrowLeft class="w-4.5 h-4.5 opacity-40" />
          </button>
          
          <input 
            ref="searchInputRef"
            v-model="searchQuery"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keyup.enter="doSearch"
            type="text" 
            :placeholder="t('search.placeholder')"
            class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20 placeholder:font-medium"
            style="color: var(--text-primary);"
          />
          
          <button v-if="searchQuery" @click="clearSearch" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
            <X class="w-3.5 h-3.5 opacity-30" />
          </button>
          <Search v-else class="w-4.5 h-4.5 mr-2.5 opacity-20" />
        </div>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 pt-2">
      <!-- 1. 默认展示：紧凑间距 -->
      <div v-if="!debouncedSearchQuery" class="space-y-8 py-4 animate-fade-in">
        <section v-if="searchHistory.length > 0" class="space-y-4">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5 opacity-30">
              <History class="w-3.5 h-3.5" />
              <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('search.history') }}</span>
            </div>
            <button @click="clearHistory" class="text-[8px] font-black uppercase tracking-widest opacity-20 hover:opacity-50 transition-opacity">
              {{ t('common.clear') }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="item in searchHistory" :key="item" 
              @click="useHistory(item)"
              class="px-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
            >
              {{ item }}
            </button>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center gap-2.5 px-1 opacity-30">
            <TrendingUp class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-[0.2em]">{{ t('search.hot_tags_title') }}</span>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <button 
              v-for="tag in hotTags" :key="tag"
              @click="useHistory(tag)"
              class="p-4 rounded-[1.8rem] card-static grainy-overlay flex items-center justify-between group btn-active"
            >
              <span class="text-[11px] font-black tracking-tight opacity-60">{{ tag }}</span>
              <Sparkles class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-orange-400" />
            </button>
          </div>
        </section>
      </div>

      <!-- 2. 搜索中状态 -->
      <div v-else-if="isSearching" class="py-24 flex flex-col items-center justify-center">
        <div class="w-10 h-10 border-4 border-orange-400/10 border-t-orange-400 rounded-full animate-spin"></div>
        <p class="mt-4 text-[8px] font-black uppercase tracking-[0.3em] opacity-20">{{ t('search.searching') }}</p>
      </div>

      <!-- 3. 搜索结果：紧凑列表 -->
      <div v-else class="pt-2 animate-fade-in">
        <div class="flex items-baseline gap-2 mb-6 px-1">
          <span class="text-3xl font-serif italic tracking-tighter">{{ searchResults.length }}</span>
          <span class="text-[9px] font-black uppercase tracking-widest opacity-30">{{ t('search.found') }}</span>
        </div>
        
        <div class="space-y-4 pb-20">
          <div 
            v-for="(result, index) in searchResults" :key="result.date" 
            @click="viewMemory(result.date)"
            class="group relative p-5 rounded-[2rem] card-static grainy-overlay overflow-hidden transition-all duration-500 hover:scale-[1.01] active:scale-[0.98]"
            :style="{ animationDelay: `${index * 40}ms` }"
          >
            <div class="relative flex gap-5 items-center">
              <div class="flex-shrink-0">
                <img v-if="result.photoUrl" :src="result.photoUrl" class="w-16 h-16 rounded-[1.25rem] object-cover shadow-md" />
                <div v-else class="w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl bg-black/[0.03] dark:bg-white/[0.05] shadow-inner">
                  {{ result.mood ? MoodEmoji[result.mood as MoodType] : '📝' }}
                </div>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2.5 mb-1.5">
                  <span class="text-[8px] font-black tracking-widest uppercase opacity-30">{{ formatDate(result.date) }}</span>
                  <span v-if="result.mood" class="text-xs drop-shadow-sm">{{ MoodEmoji[result.mood as MoodType] }}</span>
                </div>
                <p 
                  class="text-xs font-medium leading-relaxed opacity-70 line-clamp-2"
                  v-html="highlightMatch(truncateText(result.content || '...'), debouncedSearchQuery)"
                />
              </div>
            </div>
          </div>
          
          <div v-if="searchResults.length === 0" class="py-24 flex flex-col items-center justify-center">
            <div class="relative w-32 h-32 mb-8">
              <div class="absolute inset-0 bg-orange-400/5 rounded-full blur-[50px]"></div>
              <div class="relative w-full h-full rounded-full border border-black/5 dark:border-white/10 flex items-center justify-center bg-white/10 dark:bg-white/5 backdrop-blur-3xl">
                <Search class="w-10 h-10 opacity-10" />
              </div>
            </div>
            <h3 class="text-xl font-serif italic opacity-40 mb-2">{{ t('search.no_results') }}</h3>
            <p class="text-[8px] font-black uppercase tracking-[0.2em] opacity-20 text-center max-w-[200px]">
              {{ t('search.no_results_sub', { query: debouncedSearchQuery }) }}
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
.search-highlight {
  background: linear-gradient(120deg, rgba(255, 140, 66, 0.15) 0%, rgba(255, 140, 66, 0.3) 100%);
  color: var(--text-primary);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 800;
}
</style>
