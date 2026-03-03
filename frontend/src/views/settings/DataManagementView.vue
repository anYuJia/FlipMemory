<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Download, Trash2, FileJson, FileImage, AlertTriangle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { logger } from '@/services/logger'
import { db } from '@/services/db'
import { useUserStore, useOfflineStore } from '@/stores'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const offlineStore = useOfflineStore()

const isLoaded = ref(false)
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

    toast.success(`导出成功！共 ${memories.length} 条记忆`)
  } catch (error) {
    logger.error('Export failed', 'DataManagement', error)
    toast.error('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

// 清除数据
const clearData = async () => {
  if (deleteConfirmText.value !== '确认删除') {
    toast.warning('请输入"确认删除"以确认操作')
    return
  }

  try {
    // 清除 IndexedDB 数据
    await offlineStore.clearAllCache()

    // 清除本地存储
    localStorage.clear()

    // 登出用户
    userStore.logout()

    toast.success('所有数据已清除')
    showDeleteConfirm.value = false

    // 跳转到登录页
    setTimeout(() => {
      router.push({ name: 'auth' })
    }, 1000)
  } catch (error) {
    logger.error('Clear data failed', 'DataManagement', error)
    toast.error('清除失败，请重试')
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
})
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
      class="sticky top-0 z-40 safe-area-top"
      style="background: rgba(var(--bg-primary-rgb), 0.9); backdrop-filter: blur(20px);"
    >
      <div class="max-w-lg mx-auto px-4 py-3">
        <div class="flex items-center gap-3">
          <button 
            @click="goBack"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
            style="background: var(--card-bg);"
          >
            <ArrowLeft class="w-5 h-5" style="color: var(--text-secondary);" />
          </button>
          <h1 class="text-lg font-semibold" style="color: var(--text-primary);">数据管理</h1>
        </div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <div class="relative max-w-lg mx-auto px-5 py-6">
      <!-- 导出数据 -->
      <section 
        class="mb-6"
        :class="{ 'animate-slide-up': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <h2 class="text-sm font-semibold mb-3" style="color: var(--text-secondary);">导出数据</h2>
        
        <div 
          class="p-4 rounded-2xl"
          style="background: var(--card-bg);"
        >
          <p class="text-sm mb-4" style="color: var(--text-muted);">
            将你的所有记忆导出为备份文件，可用于数据迁移或恢复
          </p>
          
          <!-- 导出格式选择 -->
          <div class="flex gap-2 mb-4">
            <button
              @click="exportFormat = 'json'"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300"
              :style="{
                background: exportFormat === 'json' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1))' 
                  : 'var(--bg-tertiary)',
                color: exportFormat === 'json' ? '#3b82f6' : 'var(--text-muted)',
              }"
            >
              <FileJson class="w-4 h-4" />
              <span class="text-sm font-medium">JSON 格式</span>
            </button>
            <button
              @click="exportFormat = 'images'"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300"
              :style="{
                background: exportFormat === 'images' 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))' 
                  : 'var(--bg-tertiary)',
                color: exportFormat === 'images' ? '#22c55e' : 'var(--text-muted)',
              }"
            >
              <FileImage class="w-4 h-4" />
              <span class="text-sm font-medium">含照片</span>
            </button>
          </div>
          
          <button
            @click="exportData"
            :disabled="isExporting"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            style="background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);"
          >
            <span v-if="isExporting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <Download v-else class="w-4 h-4" />
            <span>{{ isExporting ? '导出中...' : '开始导出' }}</span>
          </button>
        </div>
      </section>
      
      <!-- 危险区域 -->
      <section 
        :class="{ 'animate-slide-up delay-100': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <h2 class="text-sm font-semibold mb-3 text-red-500">危险区域</h2>
        
        <div 
          class="p-4 rounded-2xl"
          style="background: rgba(239, 68, 68, 0.08);"
        >
          <div class="flex items-start gap-3 mb-4">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style="background: rgba(239, 68, 68, 0.12);"
            >
              <AlertTriangle class="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 class="font-medium text-red-500">清除所有数据</h3>
              <p class="text-sm mt-1" style="color: var(--text-muted);">
                永久删除所有记忆、照片和设置。此操作不可恢复，请谨慎操作。
              </p>
            </div>
          </div>
          
          <button
            @click="showDeleteConfirm = true"
            class="w-full py-3 rounded-xl font-semibold text-red-500 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style="background: rgba(239, 68, 68, 0.12);"
          >
            清除所有数据
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
            class="absolute inset-0"
            style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
          />
          
          <div 
            class="relative w-full max-w-[320px] p-6 rounded-3xl"
            style="background: var(--card-bg); box-shadow: 0 20px 60px rgba(0,0,0,0.3);"
          >
            <div 
              class="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style="background: rgba(239, 68, 68, 0.12);"
            >
              <Trash2 class="w-7 h-7 text-red-500" />
            </div>
            
            <h3 class="text-lg font-bold text-center mb-2 text-red-500">
              确认清除所有数据？
            </h3>
            
            <p class="text-sm text-center mb-4" style="color: var(--text-muted);">
              此操作将永久删除你的所有数据，包括记忆、照片和设置，且无法恢复。
            </p>
            
            <div class="mb-4">
              <label class="text-xs mb-1.5 block" style="color: var(--text-muted);">
                请输入 <span class="font-semibold text-red-500">"确认删除"</span> 以确认操作
              </label>
              <input
                v-model="deleteConfirmText"
                type="text"
                placeholder="确认删除"
                class="w-full px-4 py-2.5 rounded-xl outline-none text-center"
                style="background: var(--bg-tertiary); color: var(--text-primary);"
              />
            </div>
            
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false; deleteConfirmText = ''"
                class="flex-1 py-3 rounded-xl font-medium transition-all duration-300"
                style="background: var(--bg-tertiary); color: var(--text-secondary);"
              >
                取消
              </button>
              <button
                @click="clearData"
                :disabled="deleteConfirmText !== '确认删除'"
                class="flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50"
                style="background: linear-gradient(135deg, #ef4444, #dc2626);"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
