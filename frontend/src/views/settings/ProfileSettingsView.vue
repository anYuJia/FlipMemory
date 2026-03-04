<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import {
  ArrowLeft, Camera, User, Calendar as CalendarIcon,
  Loader2, UserCircle, Briefcase, Heart, X, Plus, ChevronRight
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import IOSPicker from '@/components/ui/IOSPicker.vue'
import type { PickerColumn } from '@/components/ui/IOSPicker.vue'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const { t } = useI18n()

const MAX_INTERESTS = 10
const isSaving = ref(false)
const selectedAge = ref<number | null>(null)
const showInterestInput = ref(false)
const newInterest = ref('')

// Avatar
const avatarInput = ref<HTMLInputElement | null>(null)

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    userStore.updateProfile({ avatar: dataUrl })
    toast.success(t('settings.profile.save_success'))
  }
  reader.readAsDataURL(file)
}

// Pickers visibility
const showBirthdayPicker = ref(false)
const showProfessionPicker = ref(false)
const showGenderPicker = ref(false)
const showAgePicker = ref(false)

const interestTagMap = {
  '阅读': 'reading', '旅行': 'travel', '美食': 'food', '音乐': 'music', '电影': 'movie', '运动': 'sports',
  '摄影': 'photography', '绘画': 'drawing', '游戏': 'gaming', '编程': 'coding', '烹饪': 'cooking', '园艺': 'gardening',
  '瑜伽': 'yoga', '冥想': 'meditation', '徒步': 'hiking', '骑行': 'cycling', '健身': 'fitness', '游泳': 'swimming',
  'Reading': 'reading', 'Travel': 'travel', 'Food': 'food', 'Music': 'music', 'Movies': 'movie', 'Sports': 'sports',
  'Photography': 'photography', 'Drawing': 'drawing', 'Gaming': 'gaming', 'Coding': 'coding', 'Cooking': 'cooking', 'Gardening': 'gardening',
  'Yoga': 'yoga', 'Meditation': 'meditation', 'Hiking': 'hiking', 'Cycling': 'cycling', 'Fitness': 'fitness', 'Swimming': 'swimming'
}

const formData = ref({
  nickname: userStore.profile?.nickname || '',
  gender: (userStore.profile?.gender || null) as 'male' | 'female' | 'other' | null,
  birthday: userStore.profile?.birthday || '',
  profession: userStore.profile?.profession || '',
  interests: [
    ...(userStore.profile?.interests || []).map(i => (interestTagMap as any)[i] || i)
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
  interestTagKeys.map(key => ({
    key,
    label: t(`settings.profile.interest_tags.${key}`)
  }))
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

const ageColumns = computed<PickerColumn[]>(() => {
  const options = ageOptions.map(num => ({
    value: num,
    label: t('settings.profile.age_unit', { age: num })
  }))
  return [{ key: 'age', options, defaultValue: selectedAge.value || 25 }]
})

const onAgeConfirm = (values: Record<string, string | number>) => {
  const age = Number(values.age)
  if (!age) return
  selectedAge.value = age
  const year = new Date().getFullYear() - age
  formData.value.birthday = `${year}-01-01`
}

// Birthday Picker
const currentYear = new Date().getFullYear()
const birthdayColumns = computed<PickerColumn[]>(() => {
  const parsed = formData.value.birthday ? new Date(formData.value.birthday) : new Date()
  const defYear = parsed.getFullYear()
  const defMonth = parsed.getMonth() + 1
  const defDay = parsed.getDate()

  const years: PickerColumn['options'] = []
  for (let y = currentYear; y >= currentYear - 100; y--) {
    years.push({ value: y, label: `${y}` })
  }

  const months: PickerColumn['options'] = []
  for (let m = 1; m <= 12; m++) {
    months.push({ value: m, label: `${m}`.padStart(2, '0') })
  }

  const days: PickerColumn['options'] = []
  for (let d = 1; d <= 31; d++) {
    days.push({ value: d, label: `${d}`.padStart(2, '0') })
  }

  return [
    { key: 'year', options: years, defaultValue: defYear },
    { key: 'month', options: months, defaultValue: defMonth },
    { key: 'day', options: days, defaultValue: defDay }
  ]
})

const onBirthdayConfirm = (values: Record<string, string | number>) => {
  const y = Number(values.year)
  const m = String(values.month).padStart(2, '0')
  const d = String(values.day).padStart(2, '0')
  formData.value.birthday = `${y}-${m}-${d}`
}

// Profession Picker
const professionKeys = [
  'student', 'engineer', 'designer', 'teacher', 'doctor', 'nurse',
  'lawyer', 'accountant', 'manager', 'artist', 'writer', 'programmer',
  'salesperson', 'chef', 'freelancer', 'entrepreneur', 'retired', 'other'
]

const professionColumns = computed<PickerColumn[]>(() => {
  const options = professionKeys.map(key => ({
    value: key,
    label: t(`settings.profile.professions.${key}`)
  }))
  const currentKey = professionKeys.includes(formData.value.profession)
    ? formData.value.profession
    : professionKeys[0]
  return [{ key: 'profession', options, defaultValue: currentKey }]
})

const showCustomProfessionInput = ref(false)
const customProfession = ref('')

const professionDisplay = computed(() => {
  if (!formData.value.profession) return t('settings.profile.select_profession')
  if (professionKeys.includes(formData.value.profession)) {
    return t(`settings.profile.professions.${formData.value.profession}`)
  }
  return formData.value.profession
})

const onProfessionConfirm = (values: Record<string, string | number>) => {
  const val = String(values.profession)
  if (val === 'other') {
    showCustomProfessionInput.value = true
    customProfession.value = ''
    return
  }
  formData.value.profession = val
  showCustomProfessionInput.value = false
}

const submitCustomProfession = () => {
  const val = customProfession.value.trim()
  if (val) {
    formData.value.profession = val
  }
  showCustomProfessionInput.value = false
}

// Gender Picker
const genderColumns = computed<PickerColumn[]>(() => {
  const options = genderOptions.value.map(g => ({
    value: g.value,
    label: `${g.emoji} ${g.label}`
  }))
  return [{ key: 'gender', options, defaultValue: formData.value.gender || 'male' }]
})

const genderDisplay = computed(() => {
  if (!formData.value.gender) return t('settings.profile.select_gender')
  const opt = genderOptions.value.find(o => o.value === formData.value.gender)
  return opt ? `${opt.emoji} ${opt.label}` : ''
})

const onGenderConfirm = (values: Record<string, string | number>) => {
  formData.value.gender = String(values.gender) as 'male' | 'female' | 'other'
}

// Birthday display
const birthdayDisplay = computed(() => {
  if (!formData.value.birthday) return t('settings.profile.birthday')
  return formData.value.birthday
})

const toggleInterest = (key: string) => {
  const idx = formData.value.interests.indexOf(key)
  if (idx >= 0) {
    formData.value.interests.splice(idx, 1)
    return
  }
  if (formData.value.interests.length < MAX_INTERESTS) {
    formData.value.interests.push(key)
  }
}

const removeInterest = (key: string) => {
  const idx = formData.value.interests.indexOf(key)
  if (idx >= 0) formData.value.interests.splice(idx, 1)
}

const getInterestLabel = (key: string) => {
  const tag = interestTagKeys.includes(key) ? t(`settings.profile.interest_tags.${key}`) : key
  return tag
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
      <!-- Avatar -->
      <section class="flex flex-col items-center">
        <div class="relative group cursor-pointer" @click="triggerAvatarUpload">
          <div class="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl relative">
            <img v-if="userStore.profile?.avatar || userStore.profile?.avatarUrl" :src="userStore.profile?.avatarUrl || userStore.profile?.avatar || ''" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-4xl">👤</div>
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
        <p class="mt-4 text-[10px] font-black uppercase tracking-widest opacity-30">{{ t('settings.profile.change_avatar') }}</p>
      </section>

      <!-- Basic Info -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 mb-2 opacity-40">
          <UserCircle class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.basic_info') }}</span>
        </div>

        <div class="card-static rounded-[2rem] p-2 space-y-1">
          <!-- Nickname -->
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

          <!-- Birthday (iOS Picker) -->
          <div class="flex items-center gap-4 px-6 py-4 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors rounded-2xl" @click="showBirthdayPicker = true">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10">
              <CalendarIcon class="w-5 h-5 text-blue-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.birthday') }}</label>
              <span class="text-sm font-bold" :class="formData.birthday ? '' : 'opacity-30'" style="color: var(--text-primary);">{{ birthdayDisplay }}</span>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
          </div>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <!-- Age (iOS Picker) -->
          <div class="flex items-center gap-4 px-6 py-4 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors rounded-2xl" @click="showAgePicker = true">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10">
              <UserCircle class="w-5 h-5 text-teal-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.select_age') }}</label>
              <div class="flex items-center gap-2">
                <span v-if="selectedAge" class="text-sm font-bold" style="color: var(--text-primary);">{{ t('settings.profile.age_unit', { age: selectedAge }) }}</span>
                <span v-else class="text-sm font-bold opacity-30" style="color: var(--text-primary);">{{ t('settings.profile.select_age') }}</span>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
          </div>

          <div class="h-px mx-6 bg-black/[0.03] dark:bg-white/[0.03]"></div>

          <!-- Profession (iOS Picker) -->
          <div class="flex items-center gap-4 px-6 py-4 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors rounded-2xl" @click="showProfessionPicker = true">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-500/10">
              <Briefcase class="w-5 h-5 text-indigo-500" />
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.profession') }}</label>
              <span class="text-sm font-bold" :class="formData.profession ? '' : 'opacity-30'" style="color: var(--text-primary);">{{ professionDisplay }}</span>
            </div>
            <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
          </div>
        </div>

        <!-- Custom profession input modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="showCustomProfessionInput" class="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" @click.self="showCustomProfessionInput = false">
              <div class="w-full max-w-sm rounded-3xl p-6 space-y-4" style="background: var(--card-bg);">
                <h3 class="text-sm font-black tracking-tight" style="color: var(--text-primary);">{{ t('settings.profile.profession') }}</h3>
                <input
                  v-model="customProfession"
                  :placeholder="t('settings.profile.custom_profession_placeholder')"
                  class="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/10 outline-none text-sm font-bold"
                  style="color: var(--text-primary);"
                  @keyup.enter="submitCustomProfession"
                  autofocus
                />
                <div class="flex gap-3">
                  <button @click="showCustomProfessionInput = false" class="flex-1 py-3 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-black uppercase tracking-widest" style="color: var(--text-primary);">
                    {{ t('settings.profile.picker_cancel') }}
                  </button>
                  <button @click="submitCustomProfession" class="flex-1 py-3 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
                    {{ t('settings.profile.picker_confirm') }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </section>

      <!-- Gender (iOS Picker) -->
      <section class="space-y-4">
        <div class="flex items-center gap-2 mb-2 opacity-40">
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('settings.profile.gender_title') }}</span>
        </div>
        <div
          class="card-static rounded-[2rem] flex items-center gap-4 px-6 py-4 cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
          @click="showGenderPicker = true"
        >
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-pink-500/10">
            <UserCircle class="w-5 h-5 text-pink-500" />
          </div>
          <div class="flex-1">
            <label class="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">{{ t('settings.profile.gender_title') }}</label>
            <span class="text-sm font-bold" :class="formData.gender ? '' : 'opacity-30'" style="color: var(--text-primary);">{{ genderDisplay }}</span>
          </div>
          <ChevronRight class="w-4 h-4 opacity-20" style="color: var(--text-primary);" />
        </div>
      </section>

      <!-- Interests -->
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
              {{ getInterestLabel(interest) }}
              <button @click="removeInterest(interest)">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in interestTags"
              :key="tag.key"
              @click="toggleInterest(tag.key)"
              :disabled="!formData.interests.includes(tag.key) && formData.interests.length >= MAX_INTERESTS"
              class="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all disabled:opacity-40"
              :class="formData.interests.includes(tag.key) ? 'bg-orange-500 text-white' : 'bg-black/5 dark:bg-white/10'"
              style="color: var(--text-primary);"
            >
              {{ tag.label }}
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

    <!-- iOS Pickers -->
    <IOSPicker
      v-model:visible="showBirthdayPicker"
      :title="t('settings.profile.picker_birthday_title')"
      :columns="birthdayColumns"
      :cancel-text="t('settings.profile.picker_cancel')"
      :confirm-text="t('settings.profile.picker_confirm')"
      @confirm="onBirthdayConfirm"
    />

    <IOSPicker
      v-model:visible="showAgePicker"
      :title="t('settings.profile.select_age')"
      :columns="ageColumns"
      :cancel-text="t('settings.profile.picker_cancel')"
      :confirm-text="t('settings.profile.picker_confirm')"
      @confirm="onAgeConfirm"
    />

    <IOSPicker
      v-model:visible="showProfessionPicker"
      :title="t('settings.profile.picker_profession_title')"
      :columns="professionColumns"
      :cancel-text="t('settings.profile.picker_cancel')"
      :confirm-text="t('settings.profile.picker_confirm')"
      @confirm="onProfessionConfirm"
    />

    <IOSPicker
      v-model:visible="showGenderPicker"
      :title="t('settings.profile.picker_gender_title')"
      :columns="genderColumns"
      :cancel-text="t('settings.profile.picker_cancel')"
      :confirm-text="t('settings.profile.picker_confirm')"
      @confirm="onGenderConfirm"
    />
  </div>
</template>

<style scoped>
.card-static {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(32px) saturate(180%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
