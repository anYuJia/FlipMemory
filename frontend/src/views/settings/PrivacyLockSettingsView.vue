<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Fingerprint, Lock, Shield } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const isLoaded = ref(false)
const showPinInput = ref(false)
const pinCode = ref(['', '', '', ''])
const pinInputRefs = ref<HTMLInputElement[]>([])

// 模拟隐私锁状态
const privacyLockEnabled = ref(false)
const useBiometric = ref(false)

// 验证 PIN
const validatePin = () => {
  const pin = pinCode.value.join('')
  if (pin.length === 4) {
    if (!privacyLockEnabled.value) {
      // 设置 PIN
      privacyLockEnabled.value = true
      toast.success('隐私锁已开启')
      showPinInput.value = false
    }
  }
}

// PIN 输入处理
const handlePinInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  
  if (value && value[0]) {
    pinCode.value[index] = value[0]
    if (index < 3) {
      pinInputRefs.value[index + 1]?.focus()
    } else {
      validatePin()
    }
  }
}

const handlePinKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !pinCode.value[index] && index > 0) {
    pinInputRefs.value[index - 1]?.focus()
  }
}

// 切换隐私锁
const togglePrivacyLock = () => {
  if (privacyLockEnabled.value) {
    privacyLockEnabled.value = false
    toast.info('隐私锁已关闭')
  } else {
    showPinInput.value = true
    pinCode.value = ['', '', '', '']
    setTimeout(() => {
      pinInputRefs.value[0]?.focus()
    }, 100)
  }
}

// 切换生物识别
const toggleBiometric = () => {
  if (!privacyLockEnabled.value) {
    toast.warning('请先开启隐私锁')
    return
  }
  useBiometric.value = !useBiometric.value
  toast.success(useBiometric.value ? '已开启面容 ID' : '已关闭面容 ID')
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
          <h1 class="text-lg font-semibold" style="color: var(--text-primary);">隐私锁</h1>
        </div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <div class="relative max-w-lg mx-auto px-5 py-6">
      <!-- 图标和说明 -->
      <div 
        class="text-center mb-8"
        :class="{ 'animate-slide-up': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <div 
          class="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center"
          :style="{ 
            background: privacyLockEnabled 
              ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
              : 'var(--bg-tertiary)'
          }"
        >
          <Shield 
            class="w-10 h-10" 
            :class="privacyLockEnabled ? 'text-white' : ''"
            :style="{ color: privacyLockEnabled ? undefined : 'var(--text-muted)' }"
          />
        </div>
        <h2 class="text-lg font-semibold mb-1" style="color: var(--text-primary);">
          {{ privacyLockEnabled ? '隐私保护已开启' : '保护你的私密记忆' }}
        </h2>
        <p class="text-sm" style="color: var(--text-muted);">
          {{ privacyLockEnabled ? '每次打开应用需要验证' : '使用 PIN 码或面容 ID 保护' }}
        </p>
      </div>
      
      <!-- PIN 输入（仅设置时显示） -->
      <div 
        v-if="showPinInput"
        class="mb-8 p-6 rounded-2xl"
        style="background: var(--card-bg);"
        :class="{ 'animate-scale-in': showPinInput }"
      >
        <h3 class="text-center font-medium mb-4" style="color: var(--text-primary);">设置 4 位 PIN 码</h3>
        <div class="flex justify-center gap-3">
          <input
            v-for="(_, index) in 4"
            :key="index"
            :ref="el => pinInputRefs[index] = el as HTMLInputElement"
            v-model="pinCode[index]"
            type="password"
            inputmode="numeric"
            maxlength="1"
            class="w-12 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all duration-300 focus:scale-105"
            style="background: var(--bg-tertiary); color: var(--text-primary);"
            @input="handlePinInput(index, $event)"
            @keydown="handlePinKeydown(index, $event)"
          />
        </div>
        <button 
          @click="showPinInput = false"
          class="w-full mt-4 py-2 text-sm"
          style="color: var(--text-muted);"
        >
          取消
        </button>
      </div>
      
      <!-- 设置选项 -->
      <div 
        v-if="!showPinInput"
        class="space-y-3"
        :class="{ 'animate-slide-up delay-100': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <!-- 开启/关闭隐私锁 -->
        <div 
          class="flex items-center justify-between p-4 rounded-2xl"
          style="background: var(--card-bg);"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1));"
            >
              <Lock class="w-5 h-5 text-green-500" />
            </div>
            <div>
              <span class="font-medium" style="color: var(--text-primary);">应用锁</span>
              <p class="text-sm" style="color: var(--text-muted);">使用 PIN 码保护</p>
            </div>
          </div>
          
          <!-- 开关 -->
          <button 
            @click="togglePrivacyLock"
            class="relative w-12 h-7 rounded-full transition-all duration-300"
            :style="{
              background: privacyLockEnabled 
                ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                : 'var(--bg-tertiary)',
            }"
          >
            <div 
              class="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
              :style="{ left: privacyLockEnabled ? '26px' : '4px' }"
            />
          </button>
        </div>
        
        <!-- 面容 ID -->
        <div 
          class="flex items-center justify-between p-4 rounded-2xl"
          style="background: var(--card-bg);"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.1));"
            >
              <Fingerprint class="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span class="font-medium" style="color: var(--text-primary);">面容 ID / 指纹</span>
              <p class="text-sm" style="color: var(--text-muted);">使用生物识别解锁</p>
            </div>
          </div>
          
          <!-- 开关 -->
          <button 
            @click="toggleBiometric"
            class="relative w-12 h-7 rounded-full transition-all duration-300"
            :style="{
              background: useBiometric 
                ? 'linear-gradient(135deg, #3b82f6, #6366f1)' 
                : 'var(--bg-tertiary)',
              opacity: privacyLockEnabled ? 1 : 0.5,
            }"
          >
            <div 
              class="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
              :style="{ left: useBiometric ? '26px' : '4px' }"
            />
          </button>
        </div>
      </div>
      
      <!-- 说明 -->
      <div 
        class="mt-6 p-4 rounded-xl"
        style="background: var(--bg-tertiary);"
        :class="{ 'animate-fade-in delay-300': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <p class="text-sm" style="color: var(--text-muted);">
          开启隐私锁后，每次打开应用都需要验证身份。请牢记你的 PIN 码，忘记 PIN 码将无法访问应用。
        </p>
      </div>
    </div>
  </div>
</template>
