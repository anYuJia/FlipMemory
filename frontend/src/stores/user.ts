import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User, UserSettings } from '@/types'
import api, { AppError } from '@/services/api'
import { hashPin as cryptoHashPin, verifyPin as cryptoVerifyPin } from '@/services/encryptionService'
import { logger } from '@/services/logger'
import { saveToken, getToken, removeToken } from '@/services/tokenManager'

export const useUserStore = defineStore('user', () => {
    const user = ref<User | null>(null)
    const profile = ref<any | null>(null)
    const settings = ref<UserSettings>({
        reminderEnabled: true,
        reminderTime: '21:00',
        reminderFrequency: 'daily',
        appLockEnabled: false,
        appLockType: null,
        theme: 'system',
        startOfWeek: 1,
        locale: localStorage.getItem('locale') || 'zh-CN',
    })
    const accessToken = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const isLoggedIn = computed(() => !!user.value && !!accessToken.value)
    const displayName = computed(() => {
        if (profile.value && profile.value.nickname) return profile.value.nickname
        if (user.value) return user.value.nickname || user.value.email?.split('@')[0] || 'User'
        return 'User'
    })

    async function login(account: string, password: string) {
        isLoading.value = true
        try {
            const response = await api.auth.login({ account, password })
            setAccessToken(response.accessToken)
            user.value = response.user
            setTimeout(() => { fetchProfile(); fetchSettings() }, 100)
            return response.user
        } catch (e) {
            error.value = e instanceof AppError ? e.message : 'Login failed'
            throw e
        } finally { isLoading.value = false }
    }

    async function register(email: string, username: string, password: string, nickname?: string) {
        isLoading.value = true
        try {
            const response = await api.auth.register({ email, username, password, nickname })
            setAccessToken(response.accessToken)
            user.value = response.user
            setTimeout(() => { fetchProfile(); fetchSettings() }, 100)
            return response.user
        } catch (e) {
            error.value = e instanceof AppError ? e.message : 'Register failed'
            throw e
        } finally { isLoading.value = false }
    }

    function logout() {
        user.value = null
        profile.value = null
        accessToken.value = null
        removeToken()
    }

    async function fetchProfile() {
        try { profile.value = await api.user.getProfile() } catch (e) {}
    }

    async function fetchSettings() {
        try {
            const s = await api.user.getSettings()
            settings.value = { ...settings.value, ...s }
        } catch (e) {}
    }

    async function updateSettings(newSettings: Partial<UserSettings>) {
        try {
            const s = await api.user.updateSettings(newSettings)
            settings.value = { ...settings.value, ...s }
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
        } catch (e) {}
    }

    const setLocale = (newLocale: string) => {
        localStorage.setItem('locale', newLocale)
        settings.value.locale = newLocale
        // 我们不依赖 updateSettings 的成功，直接刷新
        setTimeout(() => { window.location.reload() }, 50)
    }

    const setAccessToken = (token: string | null) => {
        accessToken.value = token
        if (token) saveToken(token)
        else removeToken()
    }

    function init() {
        const t = getToken()
        if (t) accessToken.value = t
        const s = localStorage.getItem('userSettings')
        if (s) {
            try { settings.value = { ...settings.value, ...JSON.parse(s) } } catch (e) {}
        }
        applyTheme(settings.value.theme)
    }

    function toggleReminder() {
        updateSettings({ reminderEnabled: !settings.value.reminderEnabled })
    }

    watch(() => settings.value.theme, (newTheme) => {
        applyTheme(newTheme)
    })

    return {
        user, profile, settings, accessToken, isLoading, error,
        isLoggedIn, displayName, login, register, logout,
        fetchProfile, fetchSettings, updateSettings,
        setLocale, setAccessToken, init, toggleReminder
    }
})

function applyTheme(theme: string) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
}
