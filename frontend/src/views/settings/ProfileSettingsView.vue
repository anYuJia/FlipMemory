<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { 
  ArrowLeft, Camera, User, Calendar as CalendarIcon, 
  UserRound, Briefcase, Heart, Check, Loader2, Sparkles
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const { t, locale } = useI18n()

const isLoaded = ref(true)
const isSaving = ref(false)
const showSuccess = ref(false)

// 表单数据
const formData = ref({
  nickname: userStore.profile?.nickname || '',
  gender: userStore.profile?.gender || '',
  birthday: userStore.profile?.birthday || '',
  profession: userStore.profile?.profession || '',
  hobbies: [...(userStore.profile?.hobbies || [])]
})

// 性别选项
const genderOptions = computed(() => [
  { value: 'male', label: t('common.all'), icon: UserRound, color: '#3b82f6' }, // 简化处理，实际应使用更准确词条
  { value: 'female', label: t('common.all'), icon: UserRound, color: '#ec4899' },
  { value: 'other', label: t('common.none'), icon: Sparkles, color: '#8b5cf6' }
])

const age = computed(() => {
  if (!formData.value.birthday) return 0
  const birthDate = new Date(formData.value.birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
})

const handleSave = async () => {
  isSaving.value = true
  try {
    await userStore.updateProfile(formData.value)
    showSuccess.value = true
    toast.success(t('settings.profile.save_success'))
    setTimeout(() => { showSuccess.value = false }, 2000)
  } catch (error) {
    toast.error(t('common.failed'))
  } finally {
    isSaving.value = false
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden pb-20">
    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="btn-back">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <h1 class="text-xl font-black tracking-tighter" style="color: var(--text-primary);">{{ t('settings.profile_title') }}</h1>
        </div>
        
        <button @click="handleSave" :disabled="isSaving" class="px-6 py-2 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-90 transition-all disabled:opacity-50">
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('common.save') }}</span>
        </button>
      </div>
    </header>

    <main class="relative max-w-lg mx-auto px-6 py-8 space-y-10">
      <!-- 头像 -->
      <section class="flex flex-col items-center">
        <div class="relative group">
          <div class="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl relative">
            <img v-if="userStore.profile?.avatarUrl" :src="userStore.profile.avatarUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-4xl">👤</div>
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <p class="mt-4 text-[10px] font-black uppercase tracking-widest opacity-30">{{ t('settings.profile.change_avatar') }}</p>
      </section>

      <!-- 基本信息 -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 mb-2 opacity-40">
          <UserCircle class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.basic_info') }}</span>
        </div>
        
        <div class="card-static rounded-[2rem] p-2 space-y-1">
          <!-- 昵称 -->
          <div class="flex items-center gap-4 px-6 py-4">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-500/10">
              <User class="w-5 h-5 text-orange-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.nickname') }}</label>
              <input v-model="formData.nickname" type="text" class="w-full bg-transparent border-none outline-none font-bold text-sm" style="color: var(--text-primary);" />
            </div>
          </div>
          
          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <!-- 生日 -->
          <div class="flex items-center gap-4 px-6 py-4">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10">
              <CalendarIcon class="w-5 h-5 text-blue-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.birthday') }}</label>
              <input v-model="formData.birthday" type="date" class="w-full bg-transparent border-none outline-none font-bold text-sm" style="color: var(--text-primary);" />
            </div>
            <span class="text-xs font-black opacity-30">{{ t('settings.profile.age_unit', { age }) }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}
</style>
