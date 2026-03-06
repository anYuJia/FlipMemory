<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft, Mail, Lock, ShieldCheck,
  Loader2, ArrowRight
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

// Steps: 1=email, 2=code+password
const step = ref(1)
const isLoading = ref(false)
const isFocused = ref<string | null>(null)

const codeSending = ref(false)
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const formData = ref({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const shakeFields = ref({
  email: false,
  code: false,
  newPassword: false,
  confirmPassword: false
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => { shakeFields.value[field] = false }, 500)
}

const isConfirmMatch = computed(() => {
  if (!formData.value.confirmPassword) return true
  return formData.value.newPassword === formData.value.confirmPassword
})

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const canSendCode = computed(() => {
  return isValidEmail(formData.value.email) && !codeSending.value && codeCooldown.value === 0
})

const startCooldown = () => {
  codeCooldown.value = 60
  cooldownTimer = setInterval(() => {
    codeCooldown.value--
    if (codeCooldown.value <= 0) {
      codeCooldown.value = 0
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
    }
  }, 1000)
}

const handleSendCode = async () => {
  if (!isValidEmail(formData.value.email)) { triggerShake('email'); return }
  if (!canSendCode.value) return

  codeSending.value = true
  try {
    await api.auth.sendCode({ email: formData.value.email, purpose: 'reset_password' })
    toast.success(t('auth.code_sent'))
    startCooldown()
    step.value = 2
  } catch (err: any) {
    toast.error(err.message || t('auth.code_send_failed'))
  } finally {
    codeSending.value = false
  }
}

const onCodeInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  input.value = input.value.replace(/\D/g, '').slice(0, 6)
  formData.value.code = input.value
}

const handleReset = async () => {
  if (!formData.value.code) { triggerShake('code'); return }
  if (!formData.value.newPassword) { triggerShake('newPassword'); return }
  if (formData.value.newPassword !== formData.value.confirmPassword) { triggerShake('confirmPassword'); return }

  isLoading.value = true
  try {
    await api.auth.resetPassword({
      email: formData.value.email,
      code: formData.value.code,
      newPassword: formData.value.newPassword
    })
    toast.success(t('auth.reset_success'))
    router.replace({ name: 'auth' })
  } catch (err: any) {
    toast.error(err.message || t('auth.auth_failed'))
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<template>
  <div class="page-container min-h-screen flex flex-col relative overflow-hidden bg-primary">
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[60%] rounded-full blur-[150px] opacity-20 animate-pulse-slow"
        :style="{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }"></div>
    </div>

    <!-- Back button -->
    <header class="relative z-10 pt-14 px-7 safe-area-top">
      <button @click="router.back()" class="p-2 -ml-2 opacity-40 hover:opacity-100 transition-opacity">
        <ArrowLeft class="w-5 h-5" />
      </button>
    </header>

    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-20 -mt-16">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-serif italic tracking-tight mb-2">{{ t('auth.forgot_title') }}</h1>
        <p class="text-xs opacity-30">{{ t('auth.forgot_subtitle') }}</p>
      </div>

      <div class="w-full max-w-sm p-8 rounded-[3.5rem] card-static grainy-overlay">
        <!-- Step 1: Email -->
        <div v-if="step === 1" class="space-y-5">
          <div
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'email' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.email ? 'animate-shake' : ''
            ]"
          >
            <Mail class="w-5 h-5 opacity-20" />
            <input
              v-model="formData.email"
              type="email"
              :placeholder="t('auth.email_placeholder')"
              @focus="isFocused = 'email'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <button
            @click="handleSendCode"
            :disabled="!canSendCode"
            class="w-full py-5 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.3em] transition-all btn-active shadow-xl flex items-center justify-center gap-3"
          >
            <Loader2 v-if="codeSending" class="w-5 h-5 animate-spin" />
            <template v-else>
              {{ t('auth.send_code') }}
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </div>

        <!-- Step 2: Code + New Password -->
        <div v-else class="space-y-5">
          <!-- Code -->
          <div
            class="flex items-center gap-3 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'code' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.code ? 'animate-shake' : ''
            ]"
          >
            <ShieldCheck class="w-5 h-5 opacity-20" />
            <input
              v-model="formData.code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              @input="onCodeInput"
              :placeholder="t('auth.code_placeholder')"
              @focus="isFocused = 'code'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20 tracking-[0.3em]"
            />
            <button
              type="button"
              @click="handleSendCode"
              :disabled="!canSendCode"
              class="shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              :class="canSendCode
                ? 'bg-black dark:bg-white text-white dark:text-black opacity-90 hover:opacity-100'
                : 'bg-black/10 dark:bg-white/10 opacity-30 cursor-not-allowed'"
            >
              {{ codeCooldown > 0 ? t('auth.resend_code', { seconds: codeCooldown }) : t('auth.send_code') }}
            </button>
          </div>

          <!-- New Password -->
          <div
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'newPassword' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.newPassword ? 'animate-shake' : ''
            ]"
          >
            <Lock class="w-5 h-5 opacity-20" />
            <input
              v-model="formData.newPassword"
              type="password"
              :placeholder="t('auth.new_password_placeholder')"
              @focus="isFocused = 'newPassword'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <!-- Confirm Password -->
          <div
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              shakeFields.confirmPassword ? 'animate-shake' : '',
              !isConfirmMatch ? 'border-red-500/20 bg-red-500/5' : 'bg-[#F5F4F0] dark:bg-[#121217]'
            ]"
          >
            <Lock class="w-5 h-5 opacity-20" />
            <input
              v-model="formData.confirmPassword"
              type="password"
              :placeholder="t('auth.confirm_password_placeholder')"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <button
            @click="handleReset"
            :disabled="isLoading"
            class="w-full py-5 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.3em] transition-all btn-active shadow-xl flex items-center justify-center gap-3"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
            <template v-else>
              {{ t('auth.reset_password') }}
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </div>

        <div class="mt-8 text-center">
          <button @click="router.push({ name: 'auth' })" class="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all">
            {{ t('auth.back_to_login') }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse-slow {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(1.1); }
}
.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
