<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { safeBack } from '@/router'
import { ArrowLeft, Lock, Loader2, Check, ShieldCheck, Mail } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores'
import api from '@/services/api'

const { t } = useI18n()
const toast = useToast()
const userStore = useUserStore()

const isLoading = ref(false)
const isFocused = ref<string | null>(null)

// 两种模式: 'password' 用旧密码, 'code' 用验证码
const mode = ref<'password' | 'code'>('password')

const codeSending = ref(false)
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const formData = ref({
  oldPassword: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const shakeFields = ref({
  oldPassword: false,
  code: false,
  newPassword: false,
  confirmPassword: false
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => { shakeFields.value[field] = false }, 500)
}

const userEmail = computed(() => userStore.user?.email || '')

const maskedEmail = computed(() => {
  const email = userEmail.value
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
})

const canSendCode = computed(() => {
  return !!userEmail.value && !codeSending.value && codeCooldown.value === 0
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
  if (!canSendCode.value) return

  codeSending.value = true
  try {
    await api.auth.sendCode({ email: userEmail.value, purpose: 'change_password' })
    toast.success(t('auth.code_sent'))
    startCooldown()
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

const switchMode = (newMode: 'password' | 'code') => {
  mode.value = newMode
  formData.value.oldPassword = ''
  formData.value.code = ''
}

const handleSubmit = async () => {
  if (mode.value === 'password') {
    if (!formData.value.oldPassword) { triggerShake('oldPassword'); return }
  } else {
    if (!formData.value.code || formData.value.code.length !== 6) { triggerShake('code'); return }
  }
  if (!formData.value.newPassword || formData.value.newPassword.length < 8) { triggerShake('newPassword'); return }
  if (formData.value.newPassword !== formData.value.confirmPassword) { triggerShake('confirmPassword'); return }

  isLoading.value = true
  try {
    const payload: { oldPassword?: string; code?: string; newPassword: string } = {
      newPassword: formData.value.newPassword
    }
    if (mode.value === 'password') {
      payload.oldPassword = formData.value.oldPassword
    } else {
      payload.code = formData.value.code
    }

    await api.auth.changePassword(payload)
    toast.success(t('auth.change_password_success'))
    safeBack()
  } catch (err: any) {
    toast.error(err.message || t('common.failed'))
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<template>
  <div class="page-container">
    <!-- Background -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-60"
        style="background: var(--color-primary);"
      />
    </div>

    <!-- Header -->
    <header class="relative z-10 pt-14 pb-6 px-7 safe-area-top">
      <div class="flex items-center gap-4">
        <button @click="safeBack()" class="p-2 -ml-2 rounded-2xl bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft class="w-5 h-5 opacity-40" />
        </button>
        <h1 class="text-2xl font-serif italic tracking-tight" style="color: var(--text-primary);">
          {{ t('auth.change_password') }}
        </h1>
      </div>
    </header>

    <main class="relative z-10 max-w-lg mx-auto px-7">
      <div class="rounded-[2.2rem] overflow-hidden card-static shadow-sm grainy-overlay p-6 space-y-5">
        <!-- Mode Toggle -->
        <div class="flex p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10">
          <button
            @click="switchMode('password')"
            class="flex-1 px-3 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-500"
            :class="mode === 'password' ? 'bg-white dark:bg-white/10 shadow-sm opacity-100' : 'opacity-30'"
          >
            {{ t('auth.via_password') }}
          </button>
          <button
            @click="switchMode('code')"
            class="flex-1 px-3 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-500"
            :class="mode === 'code' ? 'bg-white dark:bg-white/10 shadow-sm opacity-100' : 'opacity-30'"
          >
            {{ t('auth.via_code') }}
          </button>
        </div>

        <!-- Old Password (password mode) -->
        <div v-if="mode === 'password'"
          class="flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 border border-transparent"
          :class="[
            isFocused === 'old' ? 'border-orange-400/20 shadow-lg scale-[1.01] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
            shakeFields.oldPassword ? 'animate-shake' : ''
          ]"
        >
          <Lock class="w-5 h-5 opacity-20" />
          <input
            v-model="formData.oldPassword"
            type="password"
            :placeholder="t('auth.old_password_placeholder')"
            @focus="isFocused = 'old'"
            @blur="isFocused = null"
            class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
          />
        </div>

        <!-- Verification Code (code mode) -->
        <template v-if="mode === 'code'">
          <!-- Email hint -->
          <div class="flex items-center gap-3 px-5 py-3 rounded-[1.5rem] bg-[#F5F4F0] dark:bg-[#121217]">
            <Mail class="w-4 h-4 opacity-20" />
            <span class="text-xs font-bold opacity-40">{{ maskedEmail }}</span>
          </div>

          <!-- Code input -->
          <div
            class="flex items-center gap-3 px-5 py-4 rounded-[1.5rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'code' ? 'border-orange-400/20 shadow-lg scale-[1.01] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
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
        </template>

        <div class="h-px bg-black/[0.03] dark:bg-white/[0.05]"></div>

        <!-- New Password -->
        <div
          class="flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 border border-transparent"
          :class="[
            isFocused === 'new' ? 'border-orange-400/20 shadow-lg scale-[1.01] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
            shakeFields.newPassword ? 'animate-shake' : ''
          ]"
        >
          <Lock class="w-5 h-5 opacity-20" />
          <input
            v-model="formData.newPassword"
            type="password"
            :placeholder="t('auth.new_password_placeholder')"
            @focus="isFocused = 'new'"
            @blur="isFocused = null"
            class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
          />
        </div>

        <!-- Confirm New Password -->
        <div
          class="flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 border border-transparent"
          :class="[
            shakeFields.confirmPassword ? 'animate-shake' : '',
            formData.confirmPassword && formData.newPassword !== formData.confirmPassword
              ? 'border-red-500/20 bg-red-500/5'
              : 'bg-[#F5F4F0] dark:bg-[#121217]'
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

        <!-- Submit -->
        <button
          @click="handleSubmit"
          :disabled="isLoading"
          class="w-full py-4 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.3em] transition-all btn-active shadow-xl flex items-center justify-center gap-3 mt-2"
        >
          <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
          <template v-else>
            <Check class="w-4 h-4" />
            {{ t('common.save') }}
          </template>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(40px) saturate(180%);
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
