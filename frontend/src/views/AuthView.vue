<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores'
import { 
  User, Lock, Mail, Loader2, ArrowRight, 
  Eye, EyeOff, Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

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

const formData = ref({
  account: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})

const shakeFields = ref({
  account: false,
  username: false,
  email: false,
  password: false,
  confirmPassword: false,
  nickname: false
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => { shakeFields.value[field] = false }, 500)
}

const isConfirmMatch = computed(() => {
  if (!formData.value.confirmPassword) return true
  return formData.value.password === formData.value.confirmPassword
})

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
        formData.value.nickname || formData.value.username
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
}

onMounted(() => {
  setTimeout(() => { isLoaded.value = true }, 100)
})
</script>

<template>
  <div class="page-container min-h-screen flex flex-col relative overflow-hidden bg-primary">
    <!-- 电影感动态背景 -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[60%] rounded-full blur-[150px] opacity-20 animate-pulse-slow" 
        :style="{ background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)` }"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[70%] h-[50%] rounded-full blur-[120px] opacity-15" 
        :style="{ background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)` }"></div>
    </div>

    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-20">
      <!-- 品牌标识 -->
      <header class="mb-12 text-center transition-all duration-1000" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(-20px)' }">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-accent shadow-premium mb-6 ring-8 ring-orange-400/5">
          <Sparkles class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-5xl font-serif italic tracking-tighter leading-tight mb-2">
          {{ isLogin ? 'Welcome Back' : 'Join Story' }}
        </h1>
        <p class="text-xs font-black uppercase tracking-[0.4em] opacity-20">Chronos Breathing</p>
      </header>

      <!-- 表单卡片 -->
      <div 
        class="w-full max-w-sm p-8 rounded-[3.5rem] card-static grainy-overlay transition-all duration-1000"
        :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(40px)' }"
      >
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- 账号/用户名 -->
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

          <!-- 邮箱 (仅注册) -->
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

          <!-- 密码 -->
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

          <!-- 确认密码 (仅注册) -->
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

          <!-- 提交按钮 -->
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

        <!-- 切换模式 -->
        <div class="mt-8 text-center">
          <button @click="toggleMode" class="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all">
            {{ isLogin ? t('auth.no_account') : t('auth.has_account') }}
          </button>
        </div>
      </div>
    </main>

    <!-- 底部版权 -->
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
</style>
