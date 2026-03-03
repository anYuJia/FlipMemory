<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Camera, Check, User, Cake, Briefcase, Heart, X, Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores'
import { useToast } from '@/composables/useToast'
import { logger } from '@/services/logger'
import api from '@/services/api'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

const isLoaded = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const showSuccessToast = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 表单数据
const formData = ref({
  nickname: '',
  gender: '' as '' | 'male' | 'female' | 'other',
  birthday: '',
  profession: '',
  interests: [] as string[],
})

// 性别选项
const genderOptions = [
  { value: 'male', label: '男', emoji: '👨' },
  { value: 'female', label: '女', emoji: '👩' },
  { value: 'other', label: '保密', emoji: '🙂' },
]

// 预设兴趣标签
const interestTags = [
  '阅读', '旅行', '美食', '音乐', '电影', '运动',
  '摄影', '绘画', '游戏', '编程', '烹饪', '园艺',
  '瑜伽', '冥想', '徒步', '骑行', '健身', '游泳',
]

// 计算年龄
const age = computed(() => {
  if (!formData.value.birthday) return null
  const birth = new Date(formData.value.birthday)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years--
  }
  return years
})

// 新增兴趣输入
const newInterest = ref('')
const showInterestInput = ref(false)

// 切换兴趣标签
const toggleInterest = (tag: string) => {
  const index = formData.value.interests.indexOf(tag)
  if (index === -1) {
    if (formData.value.interests.length < 10) {
      formData.value.interests.push(tag)
    }
  } else {
    formData.value.interests.splice(index, 1)
  }
}

// 添加自定义兴趣
const addCustomInterest = () => {
  const interest = newInterest.value.trim()
  if (interest && !formData.value.interests.includes(interest) && formData.value.interests.length < 10) {
    formData.value.interests.push(interest)
    newInterest.value = ''
    showInterestInput.value = false
  }
}

// 移除兴趣
const removeInterest = (interest: string) => {
  const index = formData.value.interests.indexOf(interest)
  if (index !== -1) {
    formData.value.interests.splice(index, 1)
  }
}

// 保存资料
const saveProfile = async () => {
  isSaving.value = true
  
  try {
    // 使用 userStore 保存资料
    await userStore.updateProfile({
      nickname: formData.value.nickname || undefined,
      gender: formData.value.gender || null,
      birthday: formData.value.birthday || null,
      profession: formData.value.profession || null,
      interests: formData.value.interests,
    })
    
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2000)
  } finally {
    isSaving.value = false
  }
}

// 从 store 加载资料
const loadProfile = async () => {
  // 先尝试从 store 加载
  let profile = userStore.profile
  
  if (!profile) {
    // 尝试获取资料
    await userStore.fetchProfile()
    profile = userStore.profile
  }
  
  if (profile) {
    formData.value = {
      nickname: profile.nickname || '',
      gender: (profile.gender as '' | 'male' | 'female' | 'other') || '',
      birthday: profile.birthday || '',
      profession: profile.profession || '',
      interests: profile.interests || [],
    }
  }
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 验证文件大小 (最大 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过 5MB')
    return
  }

  await uploadAvatar(file)
}

// 上传头像
const uploadAvatar = async (file: File) => {
  isUploading.value = true
  try {
    // 1. 获取预签名 URL
    const { uploadUrl, key } = await api.upload.getPresignedUrl(
      file.name,
      file.type
    )

    // 2. 上传到 MinIO
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    })

    // 3. 更新用户资料中的头像 key
    await userStore.updateProfile({
      avatar: key
    })
    
    // 如果 updateProfile 成功，store 中的 profile 会更新，avatarUrl 也会同步
  } catch (error) {
    logger.error('Failed to upload avatar', 'Profile', error)
    toast.error('头像上传失败，请稍后重试')
  } finally {
    isUploading.value = false
    // 重置 input 以便下次选择同一文件
    if (fileInput.value) fileInput.value.value = ''
  }
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await loadProfile()
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
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button 
              @click="goBack"
              class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
              style="background: var(--card-bg);"
            >
              <ArrowLeft class="w-5 h-5" style="color: var(--text-secondary);" />
            </button>
            <h1 class="text-lg font-semibold" style="color: var(--text-primary);">个人资料</h1>
          </div>
          
          <!-- 保存按钮 -->
          <button 
            @click="saveProfile"
            :disabled="isSaving"
            class="px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
            style="background: linear-gradient(135deg, #fb923c, #f97316); color: white;"
          >
            <span v-if="!isSaving">保存</span>
            <span v-else class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中
            </span>
          </button>
        </div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <div class="relative max-w-lg mx-auto px-5 py-6 pb-32">
      <!-- 头像区域 -->
      <section 
        class="mb-6 flex flex-col items-center"
        :class="{ 'animate-scale-in': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div class="relative">
          <input 
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
          <div 
            @click="triggerFileInput"
            class="w-24 h-24 rounded-full flex items-center justify-center text-4xl overflow-hidden cursor-pointer haptic-feedback"
            style="background: linear-gradient(135deg, #fb923c, #f97316); box-shadow: 0 8px 32px rgba(251, 146, 60, 0.3);"
          >
            <template v-if="isUploading">
              <Loader2 class="w-8 h-8 text-white animate-spin" />
            </template>
            <template v-else>
              <img 
                v-if="userStore.profile?.avatarUrl" 
                :src="userStore.profile.avatarUrl" 
                class="w-full h-full object-cover"
              />
              <span v-else>👤</span>
            </template>
          </div>
          <button 
            @click="triggerFileInput"
            class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style="background: var(--card-bg); border: 2px solid var(--bg-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <Camera class="w-4 h-4" style="color: var(--text-secondary);" />
          </button>
        </div>
        <p class="text-sm mt-3" style="color: var(--text-muted);">点击更换头像</p>
      </section>
      
      <!-- 基本信息 -->
      <section 
        class="mb-6"
        :class="{ 'animate-slide-up delay-100': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="rounded-2xl overflow-hidden"
          style="background: var(--card-bg); border: 1px solid var(--card-border);"
        >
          <div class="px-5 py-2.5" style="background: var(--bg-tertiary);">
            <span class="text-xs font-medium" style="color: var(--text-muted);">基本信息</span>
          </div>
          
          <!-- 昵称 -->
          <div class="flex items-center gap-4 px-5 py-4">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(249, 115, 22, 0.1));"
            >
              <User class="w-5 h-5" style="color: var(--color-primary);" />
            </div>
            <div class="flex-1">
              <label class="text-xs" style="color: var(--text-muted);">昵称</label>
              <input 
                v-model="formData.nickname"
                type="text"
                placeholder="请输入昵称"
                class="w-full bg-transparent outline-none mt-0.5 font-medium"
                style="color: var(--text-primary);"
              />
            </div>
          </div>
          
          <div class="h-px mx-5" style="background: var(--border-secondary);"></div>
          
          <!-- 生日 -->
          <div class="flex items-center gap-4 px-5 py-4">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 114, 182, 0.1));"
            >
              <Cake class="w-5 h-5 text-pink-500" />
            </div>
            <div class="flex-1">
              <label class="text-xs" style="color: var(--text-muted);">生日</label>
              <div class="flex items-center gap-2 mt-0.5">
                <input 
                  v-model="formData.birthday"
                  type="date"
                  class="flex-1 bg-transparent outline-none font-medium"
                  style="color: var(--text-primary);"
                />
                <span v-if="age !== null" class="text-sm px-2 py-0.5 rounded-full" style="background: var(--bg-tertiary); color: var(--text-muted);">
                  {{ age }}岁
                </span>
              </div>
            </div>
          </div>
          
          <div class="h-px mx-5" style="background: var(--border-secondary);"></div>
          
          <!-- 职业 -->
          <div class="flex items-center gap-4 px-5 py-4">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1));"
            >
              <Briefcase class="w-5 h-5 text-blue-500" />
            </div>
            <div class="flex-1">
              <label class="text-xs" style="color: var(--text-muted);">职业</label>
              <input 
                v-model="formData.profession"
                type="text"
                placeholder="请输入职业"
                class="w-full bg-transparent outline-none mt-0.5 font-medium"
                style="color: var(--text-primary);"
              />
            </div>
          </div>
        </div>
      </section>
      
      <!-- 性别 -->
      <section 
        class="mb-6"
        :class="{ 'animate-slide-up delay-200': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="rounded-2xl overflow-hidden"
          style="background: var(--card-bg); border: 1px solid var(--card-border);"
        >
          <div class="px-5 py-2.5" style="background: var(--bg-tertiary);">
            <span class="text-xs font-medium" style="color: var(--text-muted);">性别</span>
          </div>
          
          <div class="p-4">
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="option in genderOptions"
                :key="option.value"
                @click="formData.gender = option.value as 'male' | 'female' | 'other'"
                class="relative flex flex-col items-center gap-2 py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                :style="{
                  background: formData.gender === option.value 
                    ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.08), rgba(249, 115, 22, 0.04))' 
                    : 'var(--bg-tertiary)',
                }"
              >
                <!-- 左侧高亮条 -->
                <div 
                  v-if="formData.gender === option.value"
                  class="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                  style="background: linear-gradient(180deg, #fb923c, #f97316);"
                />
                <span class="text-2xl">{{ option.emoji }}</span>
                <span 
                  class="text-sm font-medium"
                  :style="{ color: formData.gender === option.value ? 'var(--color-primary)' : 'var(--text-secondary)' }"
                >
                  {{ option.label }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 兴趣爱好 -->
      <section 
        class="mb-6"
        :class="{ 'animate-slide-up delay-300': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="rounded-2xl overflow-hidden"
          style="background: var(--card-bg); border: 1px solid var(--card-border);"
        >
          <div class="px-5 py-2.5 flex items-center justify-between" style="background: var(--bg-tertiary);">
            <div class="flex items-center gap-2">
              <Heart class="w-4 h-4" style="color: var(--color-primary);" />
              <span class="text-xs font-medium" style="color: var(--text-muted);">兴趣爱好</span>
            </div>
            <span class="text-xs" style="color: var(--text-muted);">{{ formData.interests.length }}/10</span>
          </div>
          
          <div class="p-4">
            <!-- 已选标签 -->
            <div v-if="formData.interests.length > 0" class="flex flex-wrap gap-2 mb-4">
              <div
                v-for="interest in formData.interests"
                :key="interest"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08)); color: var(--color-primary);"
              >
                {{ interest }}
                <button 
                  @click="removeInterest(interest)"
                  class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <!-- 预设标签 -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tag in interestTags"
                :key="tag"
                @click="toggleInterest(tag)"
                :disabled="!formData.interests.includes(tag) && formData.interests.length >= 10"
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                :style="{
                  background: formData.interests.includes(tag) 
                    ? 'linear-gradient(135deg, #fb923c, #f97316)' 
                    : 'var(--bg-tertiary)',
                  color: formData.interests.includes(tag) ? 'white' : 'var(--text-secondary)',
                }"
              >
                {{ tag }}
              </button>
              
              <!-- 添加自定义 -->
              <button
                v-if="!showInterestInput && formData.interests.length < 10"
                @click="showInterestInput = true"
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                style="background: var(--bg-tertiary); color: var(--text-muted); border: 1px dashed var(--border-primary);"
              >
                + 自定义
              </button>
            </div>
            
            <!-- 自定义输入 -->
            <div v-if="showInterestInput" class="mt-3 flex gap-2">
              <input 
                v-model="newInterest"
                type="text"
                placeholder="输入兴趣爱好"
                maxlength="10"
                class="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style="background: var(--bg-tertiary); color: var(--text-primary);"
                @keyup.enter="addCustomInterest"
              />
              <button 
                @click="addCustomInterest"
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style="background: linear-gradient(135deg, #fb923c, #f97316);"
              >
                <Check class="w-5 h-5 text-white" />
              </button>
              <button 
                @click="showInterestInput = false; newInterest = ''"
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style="background: var(--bg-tertiary);"
              >
                <X class="w-5 h-5" style="color: var(--text-muted);" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
    
    <!-- 成功提示 -->
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-y-4"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div 
        v-if="showSuccessToast"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl flex items-center gap-2"
        style="background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);"
      >
        <Check class="w-5 h-5 text-white" />
        <span class="text-white font-medium">保存成功</span>
      </div>
    </Transition>
  </div>
</template>
