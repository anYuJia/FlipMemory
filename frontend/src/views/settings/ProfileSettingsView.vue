<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import {
  ArrowLeft, Camera, User, Calendar as CalendarIcon,
  Loader2, UserCircle, Briefcase, Heart, X, Plus
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const { t } = useI18n()

const MAX_INTERESTS = 10
const isSaving = ref(false)
const selectedAge = ref<number | null>(null)
const showInterestInput = ref(false)
const newInterest = ref('')

const formData = ref({
  nickname: userStore.profile?.nickname || '',
  gender: (userStore.profile?.gender || null) as 'male' | 'female' | 'other' | null,
  birthday: userStore.profile?.birthday || '',
  profession: userStore.profile?.profession || '',
  interests: [
    ...(userStore.profile?.interests || (userStore.profile as { hobbies?: string[] } | null)?.hobbies || [])
  ]
})

const genderOptions = computed(() => [
  { value: 'male' as const, label: t('settings.profile.gender.male'), emoji: '👨' },
  { value: 'female' as const, label: t('settings.profile.gender.female'), emoji: '👩' },
  { value: 'other' as const, label: t('settings.profile.gender.other'), emoji: '🙂' }
])

const interestTagKeys = [
  'reading', 'travel', 'food', 'music', 'movie', 'sports',
  'photography', 'drawing', 'gaming', 'coding', 'cooking', 'gardening',
  'yoga', 'meditation', 'hiking', 'cycling', 'fitness', 'swimming'
]

const interestTags = computed(() =>
  interestTagKeys.map(key => t(`settings.profile.interest_tags.${key}`))
)

const ageOptions = Array.from({ length: 73 }, (_, i) => i + 13)

const calculateAge = (birthday: string): number | null => {
  if (!birthday) return null
  const birthDate = new Date(birthday)
  if (Number.isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age >= 0 ? age : null
}

watch(
  () => formData.value.birthday,
  (birthday) => {
    selectedAge.value = calculateAge(birthday)
  },
  { immediate: true }
)

const onAgeSelect = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!value) {
    selectedAge.value = null
    return
  }
  selectedAge.value = value
  const year = new Date().getFullYear() - value
  formData.value.birthday = `${year}-01-01`
}

const toggleInterest = (tag: string) => {
  const idx = formData.value.interests.indexOf(tag)
  if (idx >= 0) {
    formData.value.interests.splice(idx, 1)
    return
  }
  if (formData.value.interests.length < MAX_INTERESTS) {
    formData.value.interests.push(tag)
  }
}

const removeInterest = (interest: string) => {
  const idx = formData.value.interests.indexOf(interest)
  if (idx >= 0) formData.value.interests.splice(idx, 1)
}

const addCustomInterest = () => {
  const interest = newInterest.value.trim()
  if (!interest) return
  if (formData.value.interests.includes(interest)) {
    newInterest.value = ''
    showInterestInput.value = false
    return
  }
  if (formData.value.interests.length < MAX_INTERESTS) {
    formData.value.interests.push(interest)
    newInterest.value = ''
    showInterestInput.value = false
  }
}

const handleSave = async () => {
  isSaving.value = true
  try {
    await userStore.updateProfile({
      nickname: formData.value.nickname.trim(),
      gender: formData.value.gender || null,
      birthday: formData.value.birthday || null,
      profession: formData.value.profession.trim() || null,
      interests: formData.value.interests
    })
    toast.success(t('settings.profile.save_success'))
  } catch {
    toast.error(t('common.failed'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="page-container min-h-screen relative overflow-x-hidden pb-20">
    <header class="sticky top-0 z-40 safe-area-top backdrop-blur-xl">
      <div class="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="router.back()" class="btn-back">
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

    <main class="relative max-w-lg mx-auto px-6 py-8 space-y-8">
      <section class="flex flex-col items-center">
        <div class="relative group">
          <div class="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl relative">
            <img v-if="userStore.profile?.avatar || userStore.profile?.avatarUrl" :src="userStore.profile?.avatarUrl || userStore.profile?.avatar || ''" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-4xl">👤</div>
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <p class="mt-4 text-[10px] font-black uppercase tracking-widest opacity-30">{{ t('settings.profile.change_avatar') }}</p>
      </section>

      <section class="space-y-4">
        <div class="flex items-center gap-2 mb-2 opacity-40">
          <UserCircle class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.basic_info') }}</span>
        </div>

        <div class="card-static rounded-[2rem] p-2 space-y-1">
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

          <div class="flex items-center gap-4 px-6 py-4">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10">
              <CalendarIcon class="w-5 h-5 text-blue-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.birthday') }}</label>
              <input v-model="formData.birthday" type="date" class="w-full bg-transparent border-none outline-none font-bold text-sm" style="color: var(--text-primary);" />
            </div>
            <select class="text-xs font-black opacity-70 bg-transparent border border-black/10 dark:border-white/10 rounded-lg px-2 py-1" :value="selectedAge ?? ''" @change="onAgeSelect">
              <option value="">{{ t('settings.profile.select_age') }}</option>
              <option v-for="num in ageOptions" :key="num" :value="num">
                {{ t('settings.profile.age_unit', { age: num }) }}
              </option>
            </select>
          </div>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <div class="flex items-center gap-4 px-6 py-4">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-500/10">
              <Briefcase class="w-5 h-5 text-indigo-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.profession') }}</label>
              <input v-model="formData.profession" type="text" class="w-full bg-transparent border-none outline-none font-bold text-sm" style="color: var(--text-primary);" />
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center gap-2 mb-2 opacity-40">
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.gender_title') }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="option in genderOptions"
            :key="option.value"
            @click="formData.gender = option.value"
            class="rounded-2xl px-3 py-4 transition-all border-2 card-static"
            :style="{ borderColor: formData.gender === option.value ? 'var(--color-primary)' : 'transparent' }"
          >
            <div class="text-xl">{{ option.emoji }}</div>
            <div class="mt-1 text-[10px] font-black tracking-widest uppercase opacity-70">{{ option.label }}</div>
          </button>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between mb-2 opacity-40">
          <div class="flex items-center gap-2">
            <Heart class="w-4 h-4" />
            <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.interests_title') }}</span>
          </div>
          <span class="text-[10px] font-black tracking-wider">{{ formData.interests.length }}/{{ MAX_INTERESTS }}</span>
        </div>

        <div class="card-static rounded-[2rem] p-4 space-y-4">
          <div v-if="formData.interests.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="interest in formData.interests"
              :key="interest"
              class="px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-orange-500/10 text-orange-500"
            >
              {{ interest }}
              <button @click="removeInterest(interest)">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in interestTags"
              :key="tag"
              @click="toggleInterest(tag)"
              :disabled="!formData.interests.includes(tag) && formData.interests.length >= MAX_INTERESTS"
              class="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all disabled:opacity-40"
              :class="formData.interests.includes(tag) ? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/10'"
              style="color: var(--text-primary);"
            >
              {{ tag }}
            </button>
          </div>

          <div v-if="showInterestInput" class="flex items-center gap-2">
            <input
              v-model="newInterest"
              :placeholder="t('settings.profile.custom_interest_placeholder')"
              maxlength="20"
              class="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 outline-none text-sm"
              style="color: var(--text-primary);"
              @keyup.enter="addCustomInterest"
            />
            <button class="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center" @click="addCustomInterest">
              <Plus class="w-4 h-4" />
            </button>
            <button class="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center" @click="showInterestInput = false; newInterest = ''">
              <X class="w-4 h-4" />
            </button>
          </div>

          <button
            v-else
            class="text-[11px] font-black tracking-wider uppercase px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10"
            style="color: var(--text-primary);"
            :disabled="formData.interests.length >= MAX_INTERESTS"
            @click="showInterestInput = true"
          >
            {{ t('settings.profile.add_custom_interest') }}
          </button>
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
