import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User, UserSettings } from '@/types'
import api, { AppError } from '@/services/api'
import { hashPin as cryptoHashPin, verifyPin as cryptoVerifyPin } from '@/services/encryptionService'
import { logger } from '@/services/logger'
import { saveToken, getToken, removeToken } from '@/services/tokenManager'

export const useUserStore = defineStore('user', () => {
    // ===== State =====
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

    // ===== Getters =====
    const isLoggedIn = computed(() => !!accessToken.value)

    const displayName = computed(() => {
        const name = profile.value?.nickname || user.value?.nickname || user.value?.username || user.value?.email?.split('@')[0]
        return name || 'Member'
    })

    // ===== Actions =====
    function persistUser() {
        if (user.value) localStorage.setItem('userInfo', JSON.stringify(user.value))
        if (profile.value) localStorage.setItem('userProfile', JSON.stringify(profile.value))
    }

    async function login(account: string, password: string) {
        isLoading.value = true
        try {
            const response = await api.auth.login({ account, password })
            setAccessToken(response.accessToken)
            user.value = response.user
            persistUser()
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
            persistUser()
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
        localStorage.removeItem('userInfo')
        localStorage.removeItem('userProfile')
        localStorage.removeItem('userSettings')
        removeToken()
    }

    async function fetchProfile() {
        try { 
            const res = await api.user.getProfile()
            profile.value = res
            persistUser()
        } catch (e) {}
    }

    async function updateProfile(data: any) {
        try {
            const res = await api.user.updateProfile(data)
            profile.value = res
            persistUser()
            return res
        } catch (e) { return null }
    }

    async function fetchSettings() {
        try {
            const s = await api.user.getSettings()
            settings.value = { ...settings.value, ...s }
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
        } catch (e) {}
    }

    async function updateSettings(newSettings: Partial<UserSettings>) {
        try {
            const s = await api.user.updateSettings(newSettings)
            settings.value = { ...settings.value, ...s }
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
        } catch (e) {}
    }

    // ===== 导出方法补全 =====
    function setTheme(theme: 'light' | 'dark' | 'system') {
        settings.value.theme = theme
        updateSettings({ theme })
    }

    function setLocale(newLocale: string) {
        localStorage.setItem('locale', newLocale)
        settings.value.locale = newLocale
        setTimeout(() => { window.location.reload() }, 50)
    }

    function setStartOfWeek(day: 0 | 1) {
        settings.value.startOfWeek = day
        updateSettings({ startOfWeek: day })
    }

    function toggleReminder() {
        updateSettings({ reminderEnabled: !settings.value.reminderEnabled })
    }

    function setAccessToken(token: string | null) {
        accessToken.value = token
        if (token) saveToken(token)
        else removeToken()
    }

    function init() {
        const t = getToken()
        if (t) accessToken.value = t
        const u = localStorage.getItem('userInfo')
        const p = localStorage.getItem('userProfile')
        const s = localStorage.getItem('userSettings')
        if (u) try { user.value = JSON.parse(u) } catch(e) {}
        if (p) try { profile.value = JSON.parse(p) } catch(e) {}
        if (s) try { settings.value = { ...settings.value, ...JSON.parse(s) } } catch(e) {}
        applyTheme(settings.value.theme)
        if (t) { fetchProfile(); fetchSettings() }
    }

    watch(() => settings.value.theme, (newTheme) => applyTheme(newTheme))

    return {
        user, profile, settings, accessToken, isLoading, error,
        isLoggedIn, displayName, login, register, logout,
        fetchProfile, updateProfile, fetchSettings, updateSettings,
        setTheme, setLocale, setStartOfWeek, toggleReminder, // 确保全部导出
        setAccessToken, init
    }
})

function applyTheme(theme: string) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
}
