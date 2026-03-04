<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Download, Trash2, FileJson, FileImage, AlertTriangle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { logger } from '@/services/logger'
import { db } from '@/services/db'
import { useUserStore, useOfflineStore } from '@/stores'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const offlineStore = useOfflineStore()
const { t } = useI18n()

const isLoaded = ref(true)
const isExporting = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref('')

// 导出格式
const exportFormat = ref<'json' | 'images'>('json')

// 导出数据
const exportData = async () => {
  isExporting.value = true

  try {
    // 从 IndexedDB 获取所有数据
    const memories = await db.memories.toArray()
    const calendarDays = await db.calendarDays.toArray()

    const exportPayload = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      memories: memories.map(m => ({
        date: m.date,
        content: m.content,
        mood: m.mood,
        weather: m.weather,
        location: m.location,
        photos: m.photos,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      calendarDays,
      settings: userStore.settings,
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flipmemory_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(t('settings.data.export_success', { count: memories.length }))
  } catch (error) {
    logger.error('Export failed', 'DataManagement', error)
    toast.error(t('settings.data.export_failed'))
  } finally {
    isExporting.value = false
  }
}

// 清除数据
const clearData = async () => {
  if (deleteConfirmText.value !== t('settings.data.confirm_word')) {
    toast.warning(t('settings.data.confirm_input_hint', { word: t('settings.data.confirm_word') }))
    return
  }

  try {
    // 清除 IndexedDB 数据
    await offlineStore.clearAllCache()

    // 清除本地存储
    localStorage.clear()

    // 登出用户
    userStore.logout()

    toast.success(t('settings.data.clear_success'))
    showDeleteConfirm.value = false

    // 跳转到登录页
    setTimeout(() => {
      router.push({ name: 'auth' })
    }, 1000)
  } catch (error) {
    logger.error('Clear data failed', 'DataManagement', error)
    toast.error(t('settings.data.clear_failed'))
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {})
</script>

<template>
  <div class="page-container">
    <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--glow-primary);"
      />
      <div 
        class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--glow-secondary);"
      />
    </div>
    
    <!-- 顶部导航 -->
    <header 
      class="sticky top-0 z-40 safe-area-top backdrop-blur-xl"
    >
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
        <button @click="goBack" class="btn-back">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('settings.data.title') }}</h1>
      </div>
    </header>
    
    <!-- 主内容 -->
    <div class="relative max-w-lg mx-auto px-5 py-6">
      <!-- 导出数据 -->
      <section 
        class="mb-8"
        :class="{ 'animate-slide-up': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center gap-2 mb-4 opacity-40" style="color: var(--text-primary);">
          <Download class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.data.backup_export') }}</span>
        </div>
        
        <div 
          class="p-6 rounded-[2rem] card-static"
        >
          <p class="text-[11px] font-medium leading-relaxed opacity-40 mb-6" style="color: var(--text-primary);">
            {{ t('settings.data.desc') }}
          </p>
          
          <!-- 导出格式选择 -->
          <div class="flex gap-3 mb-6">
            <button
              @click="exportFormat = 'json'"
              class="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-300 border-2"
              :style="{
                background: exportFormat === 'json' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                borderColor: exportFormat === 'json' ? 'var(--color-primary)' : 'transparent',
                color: exportFormat === 'json' ? '#fff' : 'var(--text-tertiary)',
              }"
            >
              <FileJson class="w-5 h-5" />
              <span class="text-[10px] font-black uppercase tracking-widest">{{ t('settings.data.json_format') }}</span>
            </button>
            <button
              @click="exportFormat = 'images'"
              class="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-300 border-2"
              :style="{
                background: exportFormat === 'images' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                borderColor: exportFormat === 'images' ? 'var(--color-primary)' : 'transparent',
                color: exportFormat === 'images' ? '#fff' : 'var(--text-tertiary)',
              }"
            >
              <FileImage class="w-5 h-5" />
              <span class="text-[10px] font-black uppercase tracking-widest">{{ t('settings.data.with_photos') }}</span>
            </button>
          </div>
          
          <button
            @click="exportData"
            :disabled="isExporting"
            class="w-full py-4 rounded-2xl font-black text-[11px] text-white uppercase tracking-[0.25em] transition-all active:scale-95 shadow-xl shadow-orange-500/20"
            style="background: var(--gradient-accent);"
          >
            <span v-if="isExporting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            <span v-else>{{ isExporting ? t('settings.data.exporting') : t('settings.data.start_export') }}</span>
          </button>
        </div>
      </section>
      
      <!-- 危险区域 -->
      <section 
        :class="{ 'animate-slide-up delay-100': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="flex items-center gap-2 mb-4 text-red-500 opacity-60">
          <AlertTriangle class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.data.danger_zone') }}</span>
        </div>
        
        <div 
          class="p-6 rounded-[2rem] border-2 border-red-500/20 bg-red-500/5"
        >
          <div class="flex items-start gap-4 mb-6">
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-500/10"
            >
              <Trash2 class="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 class="font-black text-sm text-red-500">{{ t('settings.data.reset_db') }}</h3>
              <p class="text-[10px] font-medium leading-relaxed opacity-60 mt-1" style="color: var(--text-primary);">
                {{ t('settings.data.reset_desc') }}
              </p>
            </div>
          </div>
          
          <button
            @click="showDeleteConfirm = true"
            class="w-full py-4 rounded-2xl font-black text-[11px] text-red-500 uppercase tracking-[0.25em] transition-all active:scale-95 bg-red-500/10 border border-red-500/20"
          >
            {{ t('settings.data.clear_all') }}
          </button>
        </div>
      </section>
    </div>
    
    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-[9998] flex items-center justify-center p-5"
          @click.self="showDeleteConfirm = false"
        >
          <div 
            class="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <div 
            class="relative w-full max-w-[320px] p-8 rounded-[2.5rem] card-static shadow-2xl"
          >
            <div 
              class="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-red-500/10"
            >
              <Trash2 class="w-8 h-8 text-red-500" />
            </div>
            
            <h3 class="text-xl font-black text-center mb-2 text-red-500 tracking-tighter">
              {{ t('settings.data.confirm_reset') }}
            </h3>
            
            <p class="text-[11px] font-medium text-center mb-6 opacity-60 leading-relaxed" style="color: var(--text-primary);">
              {{ t('settings.data.confirm_desc') }}
            </p>
            
            <div class="mb-6">
              <input
                v-model="deleteConfirmText"
                type="text"
                :placeholder="t('settings.data.input_placeholder')"
                class="w-full px-5 py-3 rounded-xl outline-none text-center text-xs font-black bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10"
                style="color: var(--text-primary);"
              />
            </div>
            
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false; deleteConfirmText = ''"
                class="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-black/5 dark:bg-white/5"
                style="color: var(--text-secondary);"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="clearData"
                :disabled="deleteConfirmText !== t('settings.data.confirm_word')"
                class="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-30"
                style="background: linear-gradient(135deg, #ef4444, #dc2626);"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
