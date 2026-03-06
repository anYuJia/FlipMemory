<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores'
import {
  User, Lock, Mail, Loader2, ArrowRight,
  Eye, EyeOff, Sparkles, ShieldCheck
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()
const toast = useToast()

const isLogin = ref(true)
const isLoading = ref(false)
const isLoaded = ref(false)
const showPassword = ref(false)
const isFocused = ref<string | null>(null)

// Verification code
const codeSending = ref(false)
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const formData = ref({
  account: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  code: ''
})

const shakeFields = ref({
  account: false,
  username: false,
  email: false,
  password: false,
  confirmPassword: false,
  nickname: false,
  code: false
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => { shakeFields.value[field] = false }, 500)
}

const isConfirmMatch = computed(() => {
  if (!formData.value.confirmPassword) return true
  return formData.value.password === formData.value.confirmPassword
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
  if (!canSendCode.value) return
  if (!isValidEmail(formData.value.email)) { triggerShake('email'); return }

  codeSending.value = true
  try {
    await api.auth.sendCode({ email: formData.value.email, purpose: 'register' })
    toast.success(t('auth.code_sent'))
    startCooldown()
  } catch (err: any) {
    toast.error(err.message || t('auth.code_send_failed'))
  } finally {
    codeSending.value = false
  }
}

const handleSubmit = async () => {
  if (isLoading.value) return

  if (isLogin.value) {
    if (!formData.value.account) { triggerShake('account'); return }
    if (!formData.value.password) { triggerShake('password'); return }
  } else {
    if (!formData.value.username) { triggerShake('username'); return }
    if (!formData.value.email) { triggerShake('email'); return }
    if (!formData.value.password) { triggerShake('password'); return }
    if (formData.value.password !== formData.value.confirmPassword) { triggerShake('confirmPassword'); return }
    if (!formData.value.code) { triggerShake('code'); return }
  }

  isLoading.value = true
  try {
    if (isLogin.value) {
      await userStore.login(formData.value.account, formData.value.password)
      toast.success(t('auth.login_success'))
    } else {
      await userStore.register(
        formData.value.email,
        formData.value.username,
        formData.value.password,
        formData.value.nickname || formData.value.username,
        formData.value.code
      )
      toast.success(t('auth.register_success'))
    }

    const redirect = route.query.redirect as string || '/'
    router.replace(redirect)
  } catch (err: any) {
    toast.error(err.message || t('auth.auth_failed'))
  } finally {
    isLoading.value = false
  }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  formData.value.code = ''
}

const onCodeInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  input.value = input.value.replace(/\D/g, '').slice(0, 6)
  formData.value.code = input.value
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<template>
  <div class="page-container min-h-screen flex flex-col relative overflow-hidden bg-primary">
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[60%] rounded-full blur-[150px] opacity-20 animate-pulse-slow"
        :style="{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[70%] h-[50%] rounded-full blur-[120px] opacity-15"
        :style="{ background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)` }"></div>
    </div>

    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-20">
      <!-- Brand -->
      <header class="mb-12 text-center transition-all duration-1000" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(-20px)' }">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-accent shadow-premium mb-6 ring-8 ring-orange-400/5">
          <Sparkles class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-5xl font-serif italic tracking-tighter leading-tight mb-2">
          {{ isLogin ? t('auth.login_heading') : t('auth.register_heading') }}
        </h1>
        <p class="text-xs font-black uppercase tracking-[0.4em] opacity-20">{{ t('auth.brand_slogan') }}</p>
      </header>

      <!-- Form Card -->
      <div
        class="w-full max-w-sm p-8 rounded-[3.5rem] card-static grainy-overlay transition-all duration-1000"
        :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(40px)' }"
      >
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Account / Username -->
          <div
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'account' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              (shakeFields.account || shakeFields.username) ? 'animate-shake' : ''
            ]"
          >
            <div class="icon-left">
              <User class="w-5 h-5 opacity-20" />
            </div>
            <input
              v-if="isLogin"
              id="account"
              v-model="formData.account"
              type="text"
              :placeholder="t('auth.account_placeholder')"
              @focus="isFocused = 'account'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
            <input
              v-else
              id="username"
              v-model="formData.username"
              type="text"
              :placeholder="t('auth.username_placeholder')"
              @focus="isFocused = 'account'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <!-- Email (register only) -->
          <div
            v-if="!isLogin"
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'email' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.email ? 'animate-shake' : ''
            ]"
          >
            <div class="icon-left">
              <Mail class="w-5 h-5 opacity-20" />
            </div>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              :placeholder="t('auth.email_placeholder')"
              @focus="isFocused = 'email'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <!-- Verification Code (register only) -->
          <div
            v-if="!isLogin"
            class="flex items-center gap-3 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'code' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.code ? 'animate-shake' : ''
            ]"
          >
            <div class="icon-left">
              <ShieldCheck class="w-5 h-5 opacity-20" />
            </div>
            <input
              id="code"
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
              <Loader2 v-if="codeSending" class="w-3.5 h-3.5 animate-spin" />
              <template v-else>
                {{ codeCooldown > 0 ? t('auth.resend_code', { seconds: codeCooldown }) : t('auth.send_code') }}
              </template>
            </button>
          </div>

          <!-- Password -->
          <div
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              isFocused === 'password' ? 'border-orange-400/20 shadow-lg scale-[1.02] bg-white dark:bg-[#1F1F2B]' : 'bg-[#F5F4F0] dark:bg-[#121217]',
              shakeFields.password ? 'animate-shake' : ''
            ]"
          >
            <div class="icon-left">
              <Lock class="w-5 h-5 opacity-20" />
            </div>
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('auth.password_placeholder')"
              @focus="isFocused = 'password'"
              @blur="isFocused = null"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
            <button type="button" @click="showPassword = !showPassword" class="p-2 opacity-20 hover:opacity-100 transition-opacity">
              <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
            </button>
          </div>

          <!-- Confirm Password (register only) -->
          <div
            v-if="!isLogin"
            class="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-500 border border-transparent"
            :class="[
              shakeFields.confirmPassword ? 'animate-shake' : '',
              !isConfirmMatch ? 'border-red-500/20 bg-red-500/5' : 'bg-[#F5F4F0] dark:bg-[#121217]'
            ]"
          >
            <div class="icon-left">
              <Lock class="w-5 h-5 opacity-20" />
            </div>
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('auth.confirm_password_placeholder')"
              class="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:opacity-20"
            />
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-5 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.3em] transition-all btn-active shadow-xl flex items-center justify-center gap-3"
          >
            <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
            <template v-else>
              {{ isLogin ? t('auth.login_submit') : t('auth.register_submit') }}
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </form>

        <!-- Forgot password (login mode) -->
        <div v-if="isLogin" class="mt-5 text-center">
          <button @click="router.push({ name: 'forgot-password' })" class="text-[9px] font-black uppercase tracking-widest opacity-25 hover:opacity-80 transition-all">
            {{ t('auth.forgot_password') }}
          </button>
        </div>

        <!-- Toggle mode -->
        <div class="mt-5 text-center">
          <button @click="toggleMode" class="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all">
            {{ isLogin ? t('auth.no_account') : t('auth.has_account') }}
          </button>
        </div>
      </div>
    </main>

    <footer class="absolute bottom-10 inset-x-0 text-center transition-all duration-1000 delay-500" :style="{ opacity: isLoaded ? 0.2 : 0 }">
      <p class="text-[9px] font-black uppercase tracking-[0.5em]">FlipMemory &copy; 2026</p>
    </footer>
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

/* 覆盖浏览器自动填充的背景色，使其与输入框容器一致 */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #F5F4F0 inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  caret-color: var(--text-primary);
  transition: background-color 5000s ease-in-out 0s;
}

.dark input:-webkit-autofill,
.dark input:-webkit-autofill:hover,
.dark input:-webkit-autofill:focus,
.dark input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #121217 inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
}
</style>
