<script lang="ts">
export default {
  name: 'SearchView'
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onActivated, onDeactivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, ArrowLeft, Clock, Sparkles, TrendingUp, Hash, Smile, Sun, Cloud, CloudRain, Wind, Snowflake } from 'lucide-vue-next'
import { useMemoryStore } from '@/stores'
import { MoodEmoji, type MoodType } from '@/types/memory'
import { sanitizeText } from '@/utils/xssSecurity'
import { useResponsive } from '@/composables/useResponsive'
import ProgressiveImage from '@/components/ui/ProgressiveImage.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const router = useRouter()
const memoryStore = useMemoryStore()

// 响应式布局
const { isMobile, isTablet, isDesktop } = useResponsive()

// 搜索结果网格列数
const resultGridClass = computed(() => {
  if (isDesktop.value) return 'grid grid-cols-2 gap-4'
  return 'space-y-3'
})

const isLoaded = ref(false)
const hasAnimated = ref(false) // 标记是否已播放过入场动画
const searchQuery = ref('')
const debouncedSearchQuery = ref('') // 防抖后的搜索词
const searchInputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const scrollY = ref(0)

// 监听搜索词变化并防抖
let debounceTimeout: any = null
watch(searchQuery, (newVal) => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    debouncedSearchQuery.value = newVal
  }, 300)
})

// 搜索历史
const searchHistory = ref<string[]>([])

// 热门搜索标签（模拟）
const hotTags = ['开心', '旅行', '美食', '工作', '周末', '朋友']

// 快速筛选
const quickFilters = [
  { icon: Smile, label: '按心情', type: 'mood' },
  { icon: Hash, label: '按标签', type: 'tag' },
  { icon: TrendingUp, label: '按时间', type: 'time' },
]

// 加载搜索历史
onMounted(() => {
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch {}
  }
  
  setTimeout(() => {
    isLoaded.value = true
    // 动画完成后标记
    setTimeout(() => {
      hasAnimated.value = true
    }, 600)
  }, 100)
  
  // 自动聚焦
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})

onActivated(() => {
  // 立即同步恢复滚动位置
  if (scrollY.value > 0) {
    window.scrollTo(0, scrollY.value)
  }
})

onDeactivated(() => {
  scrollY.value = window.scrollY
})

// 保存搜索历史
const saveToHistory = (query: string) => {
  if (!query.trim()) return

  // 清理搜索词
  const sanitizedQuery = sanitizeText(query.trim())
  if (!sanitizedQuery) return

  searchHistory.value = [
    sanitizedQuery,
    ...searchHistory.value.filter(h => h !== sanitizedQuery)
  ].slice(0, 8)

  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

// 清除历史
const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

// 搜索结果
const searchResults = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase()
  if (!query) return []
  
  const results: Array<{
    date: string
    content: string
    mood?: MoodType
    weather?: string
    photoUrl?: string
    matchType: 'content' | 'date' | 'mood'
  }> = []
  
  // 遍历内存中的记忆
  const memories = Array.from(memoryStore.memories.entries())
  
  for (const [date, memory] of memories) {
    const photoUrl = memory.photos?.[0]?.thumbnailUrl || memory.photos?.[0]?.originalUrl
    
    if (memory.content?.toLowerCase().includes(query)) {
      results.push({
        date,
        content: memory.content,
        mood: memory.mood || undefined,
        weather: memory.weather || undefined,
        photoUrl,
        matchType: 'content',
      })
      if (results.length >= 50) break
      continue
    }
    
    if (date.includes(query) || formatDate(date).includes(query)) {
      results.push({
        date,
        content: memory.content || '',
        mood: memory.mood || undefined,
        weather: memory.weather || undefined,
        photoUrl,
        matchType: 'date',
      })
      if (results.length >= 50) break
      continue
    }
    
    if (memory.mood && getMoodKeyword(memory.mood).includes(query)) {
      results.push({
        date,
        content: memory.content || '',
        mood: memory.mood || undefined,
        weather: memory.weather || undefined,
        photoUrl,
        matchType: 'mood',
      })
      if (results.length >= 50) break
    }
  }
  
  return results
})

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

// 心情关键词
const getMoodKeyword = (mood: string) => {
  const keywords: Record<string, string> = {
    happy: '开心 快乐 高兴',
    calm: '平静 安宁',
    loved: '被爱 幸福 甜蜜',
    excited: '兴奋 激动',
    thinking: '思考 沉思',
    sad: '伤心 难过 悲伤',
  }
  return keywords[mood] || ''
}

// 天气图标映射
const weatherIcons: Record<string, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  windy: Wind,
  snowy: Snowflake,
}

// 高亮匹配文本
const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return text.replace(regex, '<span class="text-gradient font-medium">$1</span>')
}

// 截断文本
const truncateText = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 搜索
const doSearch = () => {
  if (searchQuery.value.trim()) {
    debouncedSearchQuery.value = searchQuery.value
    saveToHistory(searchQuery.value)
  }
}

// 使用历史记录搜索
const useHistory = (query: string) => {
  searchQuery.value = query
  debouncedSearchQuery.value = query
}

// 查看记忆详情
const viewMemory = (date: string) => {
  saveToHistory(searchQuery.value)
  router.push({ name: 'memory-detail', params: { date } })
}

// 返回
const goBack = () => {
  router.back()
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  searchInputRef.value?.focus()
}
</script>

<template>
  <div class="page-container min-h-screen relative">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div 
        class="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 bg-orange-400"
      />
      <div 
        class="absolute bottom-1/3 -left-40 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 bg-purple-500"
      />
    </div>
    
    <!-- 顶部悬浮搜索区域 -->
    <header class="sticky top-0 z-40 safe-area-top pt-6 pb-4 px-6">
      <div class="max-w-lg mx-auto">
        <div 
          class="flex items-center gap-3 p-2 rounded-full transition-all duration-500 bg-white/60 backdrop-blur-2xl border border-white/60 shadow-lg"
          :class="isFocused ? 'ring-4 ring-orange-400/20 scale-[1.02]' : ''"
        >
          <!-- 返回按钮 -->
          <button 
            @click="goBack"
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-black/5 active:scale-95"
          >
            <ArrowLeft class="w-5 h-5 opacity-40" />
          </button>
          
          <!-- 搜索输入 -->
          <div class="flex-1 flex items-center gap-3 pr-2">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              @focus="isFocused = true"
              @blur="isFocused = false"
              @keyup.enter="doSearch"
              type="text"
              placeholder="寻找哪一段记忆..."
              class="flex-1 bg-transparent border-none outline-none text-base font-medium placeholder:opacity-30 placeholder:font-normal"
              style="color: var(--text-primary);"
            />
            
            <!-- 清除按钮 -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              leave-active-class="transition-all duration-200 ease-in"
              enter-from-class="opacity-0 scale-50 rotate-90"
              leave-to-class="opacity-0 scale-50 -rotate-90"
            >
              <button 
                v-if="searchQuery"
                @click="clearSearch"
                class="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors"
              >
                <X class="w-4 h-4 opacity-60" />
              </button>
            </Transition>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <main class="relative max-w-lg mx-auto px-6">
      <!-- 无搜索内容时的引导界面 -->
      <div 
        v-if="!searchQuery"
        class="pt-6"
      >
        <!-- 搜索历史 -->
        <section 
          v-if="searchHistory.length > 0"
          class="mb-10"
          :class="{ 'animate-slide-up': isLoaded && !hasAnimated }"
          :style="{ opacity: isLoaded ? 1 : 0 }"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Recent Searches</span>
            <button 
              @click="clearHistory"
              class="text-[10px] font-bold tracking-widest uppercase text-red-400 opacity-60 hover:opacity-100 transition-opacity"
            >
              Clear
            </button>
          </div>
          
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="(history, index) in searchHistory"
              :key="history"
              @click="useHistory(history)"
              class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-300 hover:scale-105 active:scale-95 bg-white/40 border border-white/60 shadow-sm opacity-60 hover:opacity-100"
              :style="{ animationDelay: `${index * 30}ms` }"
            >
              {{ history }}
            </button>
          </div>
        </section>
        
        <!-- 热门标签 -->
        <section 
          :class="{ 'animate-slide-up delay-100': isLoaded && !hasAnimated }"
          :style="{ opacity: isLoaded ? 1 : 0 }"
        >
          <div class="flex items-center gap-2 mb-4">
            <TrendingUp class="w-4 h-4 text-orange-400 opacity-60" />
            <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-30">Trending</span>
          </div>
          
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="(tag, index) in hotTags"
              :key="tag"
              @click="useHistory(tag)"
              class="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-300 hover:scale-105 active:scale-95 bg-orange-50/50 border border-orange-100 text-orange-600/70 hover:text-orange-600"
              :style="{ animationDelay: `${index * 30}ms` }"
            >
              {{ tag }}
            </button>
          </div>
        </section>
      </div>
      
      <!-- 搜索结果 -->
      <div v-else class="pt-6">
        <!-- 结果统计 -->
        <div 
          class="flex items-center gap-2 mb-8"
          :class="{ 'animate-fade-in': true }"
        >
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Found</span>
          <span class="text-xl font-black tracking-tighter text-gradient">{{ searchResults.length }}</span>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Memories</span>
        </div>
        
        <!-- 结果列表 -->
        <div class="space-y-4 pb-32">
          <div
            v-for="(result, index) in searchResults"
            :key="result.date"
            @click="viewMemory(result.date)"
            class="group relative p-5 rounded-[2rem] cursor-pointer transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm overflow-hidden"
            :class="{ 'animate-slide-up': true }"
            :style="{ animationDelay: `${index * 40}ms` }"
          >
            <!-- 悬浮微光 -->
            <div class="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div class="relative flex gap-5 items-center">
              <!-- 照片/心情图标 -->
              <div class="flex-shrink-0">
                <ProgressiveImage
                  v-if="result.photoUrl"
                  :src="result.photoUrl"
                  alt="记忆照片"
                  class="w-16 h-16 rounded-[1.25rem] object-cover shadow-md"
                  :lazy="true"
                />
                <div
                  v-else
                  class="w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-3xl bg-black/5 shadow-inner"
                >
                  {{ result.mood ? MoodEmoji[result.mood] : '📝' }}
                </div>
              </div>
              
              <!-- 内容 -->
              <div class="flex-1 min-w-0 py-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-[10px] font-black tracking-widest uppercase opacity-40">
                    {{ formatDate(result.date) }}
                  </span>
                  <div class="flex items-center gap-1.5 opacity-60">
                    <span v-if="result.mood" class="text-xs">{{ MoodEmoji[result.mood] }}</span>
                    <component v-if="result.weather" :is="weatherIcons[result.weather] || Cloud" class="w-3 h-3" />
                  </div>
                </div>
                
                <p 
                  class="text-sm font-medium leading-relaxed opacity-80 line-clamp-2"
                  v-html="highlightMatch(truncateText(result.content || '未留下文字记录...'), searchQuery)"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 无结果 - 艺术化空状态 -->
        <div 
          v-if="searchResults.length === 0"
          class="flex flex-col items-center justify-center py-20"
        >
          <div class="relative w-32 h-32 mb-8">
            <div class="absolute inset-0 bg-gray-200 rounded-full blur-[40px] opacity-50"></div>
            <div class="relative w-full h-full rounded-full border border-black/5 flex items-center justify-center bg-white/50 backdrop-blur-md">
              <Search class="w-10 h-10 opacity-20" />
            </div>
          </div>
          
          <h3 class="text-xl font-black tracking-tight mb-2" style="color: var(--text-primary);">No Results Found</h3>
          <p class="text-xs font-medium opacity-40 tracking-widest uppercase text-center max-w-[200px] leading-relaxed">
            没有找到与 "{{ searchQuery }}" 相关的记忆
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
:deep(.text-gradient) {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>

