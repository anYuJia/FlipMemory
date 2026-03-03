<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import CreateMenu from './CreateMenu.vue'
import { processPhoto, formatDateToString } from '@/utils/imageProcessor'

const router = useRouter()
const showMenu = ref(false)
const isProcessing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 打开菜单
const openMenu = () => {
  showMenu.value = true
}

// 关闭菜单
const closeMenu = () => {
  showMenu.value = false
}

// 选择记录
const handleRecord = () => {
  // 跳转到创建记忆页面（今天）
  const today = formatDateToString(new Date())
  router.push({ name: 'create-memory', query: { date: today } })
}

// 选择相册
const handleAlbum = () => {
  // 触发文件选择
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isProcessing.value = true

  try {
    // 处理照片：提取 EXIF + 压缩
    const result = await processPhoto(file)
    
    console.log('Photo processed:', {
      originalSize: `${(result.originalSize / 1024).toFixed(1)} KB`,
      compressedSize: `${(result.compressedSize / 1024).toFixed(1)} KB`,
      exif: result.exif,
    })

    // 确定日期
    let targetDate: string
    if (result.exif.takenAt) {
      // 使用照片拍摄时间
      targetDate = formatDateToString(result.exif.takenAt)
    } else {
      // 没有拍摄时间，使用今天
      targetDate = formatDateToString(new Date())
    }

    // 跳转到创建记忆页面，携带照片数据
    router.push({
      name: 'create-memory',
      query: {
        date: targetDate,
        fromAlbum: 'true',
      },
      // 通过 sessionStorage 传递照片数据
    })

    // 保存照片数据到 sessionStorage
    sessionStorage.setItem('pendingPhotoData', JSON.stringify({
      file: await fileToBase64(result.file),
      fileName: result.file.name,
      exif: {
        ...result.exif,
        takenAt: result.exif.takenAt?.toISOString() || null,
      },
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
    }))

  } catch (error) {
    console.error('Failed to process photo:', error)
    alert('照片处理失败，请重试')
  } finally {
    isProcessing.value = false
    // 清空 input
    input.value = ''
  }
}

// 文件转 Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <!-- 悬浮添加按钮 -->
  <button 
    @click="openMenu"
    :disabled="isProcessing"
    class="fab-button group fixed z-50 flex items-center justify-center transition-all duration-300"
    style="right: 1.5rem; bottom: 15%;"
  >
    <!-- 光晕效果 -->
    <div 
      class="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-70 group-hover:scale-125 transition-all duration-500"
      style="background: linear-gradient(135deg, #ff8c42, #ff6b6b, #c56cd6);"
    />
    
    <!-- 按钮主体 -->
    <div 
      class="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 group-active:scale-95 transition-all duration-300"
      style="background: linear-gradient(135deg, #ff8c42 0%, #ff6b6b 50%, #c56cd6 100%); box-shadow: 0 8px 32px rgba(255, 140, 66, 0.4), 0 4px 16px rgba(255, 107, 107, 0.3);"
    >
      <!-- 加载状态 -->
      <div 
        v-if="isProcessing"
        class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"
      />
      <Plus 
        v-else
        class="w-7 h-7 text-white drop-shadow-md group-hover:rotate-90 transition-transform duration-300" 
      />
    </div>
  </button>

  <!-- 隐藏的文件输入 -->
  <input
    ref="fileInputRef"
    type="file"
    accept="image/*"
    class="hidden"
    @change="handleFileSelect"
  />

  <!-- 创建菜单 -->
  <CreateMenu
    :show="showMenu"
    @close="closeMenu"
    @select-record="handleRecord"
    @select-album="handleAlbum"
  />
</template>
