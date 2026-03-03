<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, 
  ShieldAlert, Loader2, CheckCircle2, XCircle, Hash
} from 'lucide-vue-next'
import { useUserStore } from '@/stores'
import api from '@/services/api'
import { logger } from '@/services/logger'

const router = useRouter()
const userStore = useUserStore()

const isLoaded = ref(false)
const isLogin = ref(true) 
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isFocused = ref<string | null>(null)

// 表单数据
const formData = ref({
  account: '', 
  email: '',    
  username: '', 
  password: '',
  confirmPassword: '',
  nickname: '',
})

// 提交时触发的抖动状态
const shakeFields = ref({
  username: false,
  password: false,
  confirmPassword: false,
  email: false,
  nickname: false
})

const isUsernameAvailable = ref<boolean | null>(null)
const isCheckingUsername = ref(false)

const validateUsername = (username: string) => /^[a-zA-Z0-9_]{3,30}$/.test(username)

const passwordReqs = [
  { id: 'len', label: '需 8 位字符', check: (p: string) => p.length >= 8 },
  { id: 'up', label: '含大写字母', check: (p: string) => /[A-Z]/.test(p) },
  { id: 'low', label: '含小写字母', check: (p: string) => /[a-z]/.test(p) },
  { id: 'num', label: '含数字', check: (p: string) => /[0-9]/.test(p) }
]

const currentRequirement = computed(() => {
  if (!formData.value.password) return null
  return passwordReqs.find(r => !r.check(formData.value.password)) || null
})

const isPasswordAllMet = computed(() => formData.value.password.length > 0 && !currentRequirement.value)
const isConfirmMatch = computed(() => formData.value.password.length > 0 && formData.value.password === formData.value.confirmPassword)

// 用户名检测
let usernameTimeout: ReturnType<typeof setTimeout> | null = null
watch(() => formData.value.username, (newVal) => {
  if (isLogin.value) return
  isUsernameAvailable.value = null
  if (!newVal || !validateUsername(newVal)) return
  if (usernameTimeout) clearTimeout(usernameTimeout)
  usernameTimeout = setTimeout(async () => {
    isCheckingUsername.value = true
    try {
      const res = await api.auth.checkUsername(newVal)
      isUsernameAvailable.value = res.available
    } catch (e) {
      logger.warn('Check username failed', 'Auth', e)
    } finally {
      isCheckingUsername.value = false
    }
  }, 500)
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => shakeFields.value[field] = false, 500)
}

const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!isLogin.value) {
    let errorDetected = false
    if (isUsernameAvailable.value === false || !formData.value.username) { triggerShake('username'); errorDetected = true }
    if (!isPasswordAllMet.value) { triggerShake('password'); errorDetected = true }
    if (!isConfirmMatch.value) { triggerShake('confirmPassword'); errorDetected = true }
    if (!formData.value.email) { triggerShake('email'); errorDetected = true }
    if (!formData.value.nickname) { triggerShake('nickname'); errorDetected = true }
    if (errorDetected) return
  } else {
    if (!formData.value.account) { triggerShake('username'); return }
    if (!formData.value.password) { triggerShake('password'); return }
  }
  
  isLoading.value = true
  try {
    if (isLogin.value) {
      await userStore.login(formData.value.account, formData.value.password)
    } else {
      await userStore.register(formData.value.email, formData.value.username, formData.value.password, formData.value.nickname)
    }
    userStore.init()
    router.replace('/')
  } catch (error: any) {
    errorMessage.value = error.message || 'Authentication Failed'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => setTimeout(() => isLoaded.value = true, 100))
onUnmounted(() => {
  if (usernameTimeout) clearTimeout(usernameTimeout)
})
</script>

<template>
  <div class="page-container min-h-screen flex flex-col relative overflow-hidden" style="background-color: var(--bg-primary);">
    <!-- 背景 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40" style="background-color: var(--glow-primary);" />
      <div class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style="background-color: var(--glow-secondary);" />
    </div>
    
    <div class="relative flex-1 flex flex-col max-w-lg mx-auto w-full px-6">
      <header class="pt-16 pb-8 text-center transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)' }">
        <div class="w-20 h-20 mx-auto mb-4 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl bg-gradient-to-br from-orange-400 to-orange-600">📖</div>
        <h1 class="text-3xl font-black tracking-tighter" style="color: var(--text-primary);">Flip<span class="text-orange-500">Memory</span></h1>
        <p class="text-[10px] font-black mt-1 opacity-20 uppercase tracking-[0.4em]" style="color: var(--text-primary);">Personal Time Gallery</p>
      </header>
      
      <section class="flex-1 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)' }">
        <div class="p-8 rounded-[2.5rem] backdrop-blur-3xl border border-white/10 shadow-2xl" style="background-color: var(--card-bg);">
          <!-- Tab -->
          <div class="flex p-1 rounded-2xl bg-black/5 dark:bg-white/5 mb-8">
            <button @click="isLogin = true" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl" :class="isLogin ? 'bg-white dark:bg-white/15 shadow-sm opacity-100' : 'opacity-30'" style="color: var(--text-primary);">Login</button>
            <button @click="isLogin = false" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl" :class="!isLogin ? 'bg-white dark:bg-white/15 shadow-sm opacity-100' : 'opacity-30'" style="color: var(--text-primary);">Join</button>
          </div>
          
          <Transition enter-active-class="animate-shake">
            <div v-if="errorMessage" class="mb-6 p-4 rounded-2xl text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-3">
              <ShieldAlert class="w-4 h-4 shrink-0" />{{ errorMessage }}
            </div>
          </Transition>
          
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- 昵称 -->
            <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.nickname }">
              <div class="icon-left"><User class="w-5 h-5 opacity-20" /></div>
              <input v-model="formData.nickname" type="text" placeholder="Display Name" />
            </div>

            <!-- 登录账号 / 注册用户名 -->
            <div class="input-group" :class="{ 'animate-shake': shakeFields.username, 'has-error': !isLogin && isUsernameAvailable === false, 'focused': isFocused === 'account' }">
              <div class="icon-left">
                <Loader2 v-if="!isLogin && isCheckingUsername" class="w-5 h-5 animate-spin text-orange-400" />
                <template v-else>
                  <CheckCircle2 v-if="!isLogin && isUsernameAvailable === true" class="w-5 h-5 text-green-500" />
                  <XCircle v-else-if="!isLogin && isUsernameAvailable === false" class="w-5 h-5 text-red-500" />
                  <component :is="isLogin ? User : Hash" v-else class="w-5 h-5 opacity-20" />
                </template>
              </div>
              
              <!-- 修复 v-model 逻辑：分开渲染以支持响应式绑定 -->
              <input 
                v-if="isLogin" 
                v-model="formData.account" 
                type="text" 
                placeholder="Username or Email" 
                @focus="isFocused = 'account'" 
                @blur="isFocused = null" 
              />
              <input 
                v-else 
                v-model="formData.username" 
                type="text" 
                placeholder="Unique Username" 
              />
              
              <div v-if="!isLogin && isUsernameAvailable === false" class="feedback-right text-red-500">已被占用</div>
            </div>

            <!-- 邮箱 -->
            <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.email }">
              <div class="icon-left"><Mail class="w-5 h-5 opacity-20" /></div>
              <input v-model="formData.email" type="email" placeholder="Email Address" />
            </div>
            
            <!-- 密码 -->
            <div class="input-group" :class="{ 'animate-shake': shakeFields.password, 'has-error': !isLogin && currentRequirement && formData.password, 'focused': isFocused === 'pass' }">
              <div class="icon-left">
                <template v-if="!isLogin && formData.password">
                  <CheckCircle2 v-if="isPasswordAllMet" class="w-5 h-5 text-green-500" />
                  <XCircle v-else class="w-5 h-5 text-red-500" />
                </template>
                <Lock v-else class="w-5 h-5 opacity-20" />
              </div>
              <input v-model="formData.password" :type="showPassword ? 'text' : 'password'" placeholder="Password" @focus="isFocused = 'pass'" @blur="isFocused = null" />
              <div class="flex items-center gap-2">
                <div v-if="!isLogin && currentRequirement" class="feedback-right text-red-500">{{ currentRequirement.label }}</div>
                <button type="button" @click="showPassword = !showPassword" class="opacity-20 hover:opacity-100 transition-opacity">
                  <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 确认密码 -->
            <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.confirmPassword, 'has-error': formData.confirmPassword && !isConfirmMatch }">
              <div class="icon-left">
                <template v-if="formData.confirmPassword">
                  <CheckCircle2 v-if="isConfirmMatch" class="w-5 h-5 text-green-500" />
                  <XCircle v-else class="w-5 h-5 text-red-500" />
                </template>
                <Lock v-else class="w-5 h-5 opacity-20" />
              </div>
              <input v-model="formData.confirmPassword" :type="showPassword ? 'text' : 'password'" placeholder="Confirm Password" />
              <div v-if="formData.confirmPassword && !isConfirmMatch" class="feedback-right text-red-500">不一致</div>
            </div>
            
            <button type="submit" :disabled="isLoading" class="submit-btn">
              <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
              <template v-else>
                <span class="flex items-center gap-3">
                  {{ isLogin ? 'Authenticate' : 'Create Account' }}
                  <ArrowRight class="w-4 h-4" />
                </span>
              </template>
            </button>
          </form>
        </div>
      </section>
      
      <footer class="py-10 text-center transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <p class="text-[10px] font-black uppercase tracking-[0.4em] opacity-20" style="color: var(--text-primary);">FlipMemory Cloud</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.input-group {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  background-color: rgba(0, 0, 0, 0.03);
}

:root.dark .input-group {
  background-color: rgba(255, 255, 255, 0.05);
}

.input-group:focus-within {
  background-color: #fff;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.3);
}

:root.dark .input-group:focus-within {
  background-color: rgba(255, 255, 255, 0.1);
}

.input-group.has-error {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
  background-color: rgba(239, 68, 68, 0.05);
}

.icon-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 24px;
}

.input-group input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-weight: 700;
  font-size: 0.875rem;
  min-width: 0;
  color: var(--text-primary);
}

.input-group input::placeholder {
  font-weight: 400;
  opacity: 0.3;
}

.feedback-right {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  flex-shrink: 0;
  margin-left: auto;
}

.submit-btn {
  width: 100%;
  padding: 1.25rem;
  border-radius: 2rem;
  font-weight: 900;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: #fff;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  box-shadow: 0 12px 32px -8px rgba(249, 115, 22, 0.4);
}

.submit-btn:hover { transform: scale(1.02) translateY(-2px); }
.submit-btn:active { transform: scale(0.98) translateY(0); }
.submit-btn:disabled { opacity: 0.4; filter: grayscale(1); cursor: not-allowed; }

:root.dark .submit-btn {
  background: #ff8c42;
  box-shadow: 0 12px 40px -8px rgba(255, 140, 66, 0.4);
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
</style>
