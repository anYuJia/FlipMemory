<script setup lang="ts">
import { ref } from 'vue'
import { safeBack } from '@/router'
import { ArrowLeft, Lock, Loader2, Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const { t } = useI18n()
const toast = useToast()

const isLoading = ref(false)
const isFocused = ref<string | null>(null)

const formData = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const shakeFields = ref({
  oldPassword: false,
  newPassword: false,
  confirmPassword: false
})

const triggerShake = (field: keyof typeof shakeFields.value) => {
  shakeFields.value[field] = true
  setTimeout(() => { shakeFields.value[field] = false }, 500)
}

const handleSubmit = async () => {
  if (!formData.value.oldPassword) { triggerShake('oldPassword'); return }
  if (!formData.value.newPassword) { triggerShake('newPassword'); return }
  if (formData.value.newPassword.length < 8) { triggerShake('newPassword'); return }
  if (formData.value.newPassword !== formData.value.confirmPassword) { triggerShake('confirmPassword'); return }

  isLoading.value = true
  try {
    await api.auth.changePassword({
      oldPassword: formData.value.oldPassword,
      newPassword: formData.value.newPassword
    })
    toast.success(t('auth.change_password_success'))
    safeBack()
  } catch (err: any) {
    toast.error(err.message || t('common.failed'))
  } finally {
    isLoading.value = false
  }
}
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
        <!-- Old Password -->
        <div
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
