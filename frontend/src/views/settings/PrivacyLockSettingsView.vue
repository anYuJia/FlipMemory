<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Fingerprint, Lock, Shield } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const isLoaded = ref(true)
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
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">隐私安全</h1>
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
          class="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-xl"
          :style="{ 
            background: privacyLockEnabled 
              ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
              : 'var(--card-bg)'
          }"
        >
          <Shield 
            class="w-10 h-10" 
            :class="privacyLockEnabled ? 'text-white' : ''"
            :style="{ color: privacyLockEnabled ? undefined : 'var(--text-primary)' }"
          />
        </div>
        <h2 class="text-lg font-black mb-1" style="color: var(--text-primary);">
          {{ privacyLockEnabled ? '隐私保护已开启' : '保护你的私密记忆' }}
        </h2>
        <p class="text-[10px] font-bold opacity-40 uppercase tracking-widest" style="color: var(--text-primary);">
          {{ privacyLockEnabled ? 'Security Active' : 'Lock your personal records' }}
        </p>
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
          class="flex items-center justify-between p-5 rounded-[2rem] card-static"
        >
          <div class="flex items-center gap-4">
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500/10"
            >
              <Lock class="w-6 h-6 text-green-500" />
            </div>
            <div>
              <span class="font-black text-sm" style="color: var(--text-primary);">应用锁</span>
              <p class="text-[9px] font-bold opacity-40 uppercase tracking-tighter" style="color: var(--text-primary);">PIN Protection</p>
            </div>
          </div>
          
          <!-- 开关 -->
          <button 
            @click="togglePrivacyLock"
            class="relative w-12 h-7 rounded-full transition-all duration-300"
            :style="{
              background: privacyLockEnabled 
                ? 'var(--color-primary)' 
                : 'var(--border-primary)',
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
          class="flex items-center justify-between p-5 rounded-[2rem] card-static"
        >
          <div class="flex items-center gap-4">
            <div 
              class="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10"
            >
              <Fingerprint class="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <span class="font-black text-sm" style="color: var(--text-primary);">面容 ID / 指纹</span>
              <p class="text-[9px] font-bold opacity-40 uppercase tracking-tighter" style="color: var(--text-primary);">Biometric Unlock</p>
            </div>
          </div>
          
          <!-- 开关 -->
          <button 
            @click="toggleBiometric"
            class="relative w-12 h-7 rounded-full transition-all duration-300"
            :style="{
              background: useBiometric 
                ? 'var(--color-primary)' 
                : 'var(--border-primary)',
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
        class="mt-8 p-5 rounded-[1.5rem] bg-black/5 dark:bg-white/5"
        :class="{ 'animate-fade-in delay-300': isLoaded }"
        :style="{ opacity: isLoaded ? 1 : 0 }"
      >
        <p class="text-[11px] font-medium leading-relaxed opacity-40" style="color: var(--text-primary);">
          开启隐私锁后，每次打开应用都需要验证身份。请牢记你的 PIN 码，忘记 PIN 码将无法访问应用。
        </p>
      </div>
    </div>
  </div>
</template>
