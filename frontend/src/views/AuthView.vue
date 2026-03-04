<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, 
  ShieldAlert, Loader2, CheckCircle2, XCircle, Hash, Globe, WifiOff
} from 'lucide-vue-next'
import { useUserStore } from '@/stores'
import api from '@/services/api'
import { logger } from '@/services/logger'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const isLoaded = ref(true)
const isLogin = ref(true) 
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isFocused = ref<string | null>(null)

// 服务器配置相关
const showServerConfig = ref(false)
const tempApiUrl = ref(localStorage.getItem('apiUrl') || 'http://localhost:3001/api')

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
  { id: 'len', check: (p: string) => p.length >= 8 },
  { id: 'upper', check: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', check: (p: string) => /[a-z]/.test(p) },
  { id: 'num', check: (p: string) => /[0-9]/.test(p) }
]

const currentRequirement = computed(() => {
  if (isLogin.value || !formData.value.password) return null
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

const saveServerUrl = () => {
  let url = tempApiUrl.value.trim()
  if (url && !url.startsWith('http')) url = 'http://' + url
  if (url && !url.endsWith('/api')) url = url.replace(/\/$/, '') + '/api'
  localStorage.setItem('apiUrl', url)
  showServerConfig.value = false
  window.location.reload() 
}

const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!isLogin.value) {
    let errorDetected = false
    if (!formData.value.username) { triggerShake('username'); errorDetected = true }
    if (!isPasswordAllMet.value) { triggerShake('password'); errorDetected = true }
    if (!isConfirmMatch.value) { triggerShake('confirmPassword'); errorDetected = true }
    if (!formData.value.email) { triggerShake('email'); errorDetected = true }
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
      await userStore.register(formData.value.email, formData.value.username, formData.value.password, formData.value.nickname || formData.value.username)
    }
    userStore.init()
    router.replace('/')
  } catch (error: any) {
    console.error('Auth Error:', error)
    errorMessage.value = error.message || '认证失败，请检查网络或配置'
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      showServerConfig.value = true
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (tempApiUrl.value.includes('localhost') && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    showServerConfig.value = true
  }
})
onUnmounted(() => {
  if (usernameTimeout) clearTimeout(usernameTimeout)
})
</script>

<template>
  <div class="page-container min-h-screen flex flex-col relative overflow-hidden" style="background-color: var(--bg-primary);">
    <!-- 动态光晕 -->
    <div class="fixed inset-0 pointer-events-none">
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-40" style="background-color: var(--color-primary);" />
      <div class="absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style="background-color: var(--color-accent);" />
    </div>
    
    <div class="relative flex-1 flex flex-col max-w-lg mx-auto w-full px-6">
      <header class="pt-12 pb-6 text-center transition-all duration-700" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)' }">
        <div class="w-20 h-20 mx-auto mb-4 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl bg-gradient-to-br from-orange-400 to-orange-600 animate-scale-in">📖</div>
        <h1 class="text-3xl font-black tracking-tighter" style="color: var(--text-primary);">Flip<span class="text-orange-500">Memory</span></h1>
        <p class="text-[10px] font-black mt-1 opacity-20 uppercase tracking-[0.4em]" style="color: var(--text-primary);">RECORD EVERY MOMENT</p>
      </header>
      
      <section class="flex-1 transition-all duration-700 delay-100" :style="{ opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)' }">
        <div class="p-8 rounded-[3rem] backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden relative" style="background-color: var(--card-bg);">
          
          <!-- 服务器配置开关 (右上角) -->
          <button @click="showServerConfig = !showServerConfig" class="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20">
            <Globe v-if="!showServerConfig" class="w-4 h-4 opacity-30" style="color: var(--text-primary);" />
            <XCircle v-else class="w-4 h-4 opacity-30" style="color: var(--text-primary);" />
          </button>

          <!-- Tab 导航 - 彻底修复选中背景问题 -->
          <div class="flex p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 mb-10 relative">
            <div 
              class="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
              :style="{ 
                transform: isLogin ? 'translateX(0)' : 'translateX(100%)',
                backgroundColor: 'var(--color-primary)',
                boxShadow: 'none'
              }"
            ></div>
            
            <button type="button" @click="isLogin = true" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-300" :style="{ color: isLogin ? '#fff' : 'var(--text-primary)' }" :class="{ 'opacity-30': !isLogin }">登录</button>
            <button type="button" @click="isLogin = false" class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-300" :style="{ color: !isLogin ? '#fff' : 'var(--text-primary)' }" :class="{ 'opacity-30': isLogin }">注册</button>
          </div>
          
          <div class="relative min-h-[380px]">
            <Transition name="form-slide" mode="out-in">
              <!-- 正常表单页 -->
              <div v-if="!showServerConfig" :key="isLogin ? 'login' : 'register'" class="w-full">
                <div v-if="errorMessage" class="mb-6 p-4 rounded-2xl text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-3">
                  <ShieldAlert class="w-4 h-4 shrink-0" />{{ errorMessage }}
                </div>
                
                <form @submit.prevent="handleSubmit" class="space-y-5" autocomplete="off">
                  <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.nickname }">
                    <div class="icon-left"><User class="w-5 h-5 opacity-20" /></div>
                    <input v-model="formData.nickname" type="text" placeholder="您的昵称" />
                  </div>

                  <div class="input-group" :class="{ 'animate-shake': shakeFields.username, 'focused': isFocused === 'account' }">
                    <div class="icon-left">
                      <component :is="isLogin ? User : Hash" class="w-5 h-5 opacity-20" />
                    </div>
                    <input v-if="isLogin" v-model="formData.account" type="text" placeholder="账号 / 邮箱" @focus="isFocused = 'account'" @blur="isFocused = null" />
                    <input v-else v-model="formData.username" type="text" placeholder="唯一用户名" />
                  </div>

                  <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.email }">
                    <div class="icon-left"><Mail class="w-5 h-5 opacity-20" /></div>
                    <input v-model="formData.email" type="email" placeholder="邮箱地址" />
                  </div>
                  
                  <div class="input-group" :class="{ 'animate-shake': shakeFields.password, 'focused': isFocused === 'pass' }">
                    <div class="icon-left"><Lock class="w-5 h-5 opacity-20" /></div>
                    <input v-model="formData.password" :type="showPassword ? 'text' : 'password'" placeholder="密码" @focus="isFocused = 'pass'" @blur="isFocused = null" />
                    <button type="button" @click="showPassword = !showPassword" class="opacity-20 hover:opacity-100 transition-opacity">
                      <component :is="showPassword ? EyeOff : Eye" class="w-4 h-4" />
                    </button>
                  </div>

                  <div v-if="!isLogin" class="input-group" :class="{ 'animate-shake': shakeFields.confirmPassword, 'has-error': formData.confirmPassword && !isConfirmMatch }">
                    <div class="icon-left"><Lock class="w-5 h-5 opacity-20" /></div>
                    <input v-model="formData.confirmPassword" :type="showPassword ? 'text' : 'password'" placeholder="确认密码" />
                  </div>
                  
                  <button type="submit" :disabled="isLoading" class="submit-btn shadow-premium group">
                    <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
                    <template v-else>
                      <span class="flex items-center gap-3">
                        {{ isLogin ? '立即进入' : '创建账号' }}
                        <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </template>
                  </button>
                </form>

                <!-- 服务器配置入口 -->
                <button @click="showServerConfig = true" class="w-full mt-8 py-2 text-[9px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-all flex items-center justify-center gap-2" style="color: var(--text-primary);">
                  <Globe class="w-3 h-3" />
                  服务器节点设置
                </button>
              </div>

              <!-- 服务器配置面板 -->
              <div v-else key="config" class="w-full space-y-6">
                <div class="text-center py-4">
                  <h2 class="text-sm font-black" style="color: var(--text-primary);">配置后端 API 地址</h2>
                  <p class="text-[9px] opacity-40 mt-1 uppercase tracking-widest">Android Connectivity Fix</p>
                </div>
                <div class="input-group focused">
                  <Globe class="w-5 h-5 opacity-20" />
                  <input v-model="tempApiUrl" type="text" placeholder="http://192.168.x.x:3001/api" />
                </div>
                <div class="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-[9px] font-bold leading-relaxed opacity-60" style="color: var(--text-primary);">
                  当前应用运行在移动端，无法直接访问 localhost。请输入您电脑在局域网中的 IP 地址。
                </div>
                <div class="flex gap-3 pt-4">
                  <button @click="showServerConfig = false" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase bg-black/5 dark:bg-white/10" style="color: var(--text-primary);">取消</button>
                  <button @click="saveServerUrl" class="flex-1 py-4 rounded-xl text-[10px] font-black uppercase bg-orange-500 text-white shadow-lg">确认修改</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </section>
      
      <footer class="py-10 text-center transition-all duration-700 delay-300" :style="{ opacity: isLoaded ? 1 : 0 }">
        <p class="text-[10px] font-black uppercase tracking-[0.4em] opacity-20" style="color: var(--text-primary);">FlipMemory Pro Pro</p>
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
  padding: 1.15rem 1.25rem;
  border-radius: 1.5rem;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  background-color: rgba(0, 0, 0, 0.03);
  border: 1px solid transparent;
}

:root.dark .input-group {
  background-color: rgba(255, 255, 255, 0.05);
}

.input-group:focus-within, .input-group.focused {
  background-color: var(--bg-elevated);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--glow-dynamic);
}

.icon-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 24px;
}

.input-group input {
  flex: 1;
  background: transparent !important;
  border: none;
  outline: none;
  font-weight: 700;
  font-size: 0.875rem;
  min-width: 0;
  color: var(--text-primary);
}

/* 核心修复：彻底拦截系统自动填充导致的背景发白 */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--text-primary) !important;
  -webkit-box-shadow: 0 0 0px 1000px var(--card-bg) inset !important;
  transition: background-color 5000s ease-in-out 0s;
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
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  box-shadow: 0 12px 32px -8px var(--glow-dynamic);
}

.submit-btn:active { transform: scale(0.98); }

.form-slide-enter-active, .form-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.form-slide-enter-from { opacity: 0; transform: translateX(30px); }
.form-slide-leave-to { opacity: 0; transform: translateX(-30px); }

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
