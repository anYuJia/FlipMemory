<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { safeBack } from '@/router'
import { ArrowLeft, Fingerprint, Lock, Shield } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const toast = useToast()
const { t } = useI18n()

const isLoaded = ref(true)

// 模拟隐私锁状态
const privacyLockEnabled = ref(false)
const useBiometric = ref(false)

// 切换隐私锁
const togglePrivacyLock = () => {
  if (privacyLockEnabled.value) {
    privacyLockEnabled.value = false
    toast.info(t('settings.privacy.disabled_toast'))
  } else {
    privacyLockEnabled.value = true
    toast.success(t('settings.privacy.enabled_toast'))
  }
}

// 切换生物识别
const toggleBiometric = () => {
  if (!privacyLockEnabled.value) {
    toast.warning(t('settings.privacy.enable_first'))
    return
  }
  useBiometric.value = !useBiometric.value
  toast.success(useBiometric.value ? t('settings.privacy.biometric_on') : t('settings.privacy.biometric_off'))
}

const goBack = () => {
  safeBack()
}

onMounted(() => {})
</script>

<template>
  <div class="page-container">
    <!-- 背景装饰光晕 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div 
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--color-primary);"
      />
      <div 
        class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
        style="background: var(--color-accent);"
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
        <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('settings.privacy.title') }}</h1>
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
          {{ privacyLockEnabled ? t('settings.privacy.enabled') : t('settings.privacy.disabled') }}
        </h2>
        <p class="text-[10px] font-bold opacity-40 uppercase tracking-widest" style="color: var(--text-primary);">
          {{ privacyLockEnabled ? t('settings.privacy.enabled_sub') : t('settings.privacy.disabled_sub') }}
        </p>
      </div>
      
      <!-- 设置选项 -->
      <div 
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
              <span class="font-black text-sm" style="color: var(--text-primary);">{{ t('settings.privacy.app_lock') }}</span>
              <p class="text-[9px] font-bold opacity-40 uppercase tracking-tighter" style="color: var(--text-primary);">{{ t('settings.privacy.pin_protection') }}</p>
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
              <span class="font-black text-sm" style="color: var(--text-primary);">{{ t('settings.privacy.biometric') }}</span>
              <p class="text-[9px] font-bold opacity-40 uppercase tracking-tighter" style="color: var(--text-primary);">{{ t('settings.privacy.biometric_unlock') }}</p>
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
          {{ t('settings.privacy.note') }}
        </p>
      </div>
    </div>
  </div>
</template>
