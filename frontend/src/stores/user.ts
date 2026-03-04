import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSettings } from '@/types'
import api from '@/services/api'
import { saveToken, getToken, removeToken } from '@/services/tokenManager'

export interface UserProfile {
    id: string
    email: string
    nickname: string
    gender?: 'male' | 'female' | 'other' | null
    birthday?: string | null
    profession?: string | null
    interests?: string[]
    avatar?: string | null
    avatarUrl?: string | null
}

export const useUserStore = defineStore('user', () => {
    const user = ref<User | null>(null)
    const profile = ref<UserProfile | null>(null)
    const accessToken = ref<string | null>(null)

    // 主题控制
    const themeColor = ref(localStorage.getItem('themeColor') || 'auto')
    const customColors = ref({
        primary: localStorage.getItem('customPrimary') || '#FF8C42',
        bg: localStorage.getItem('customBg') || '#F9F8F6'
    })

    // 颜色历史记录
    const colorHistory = ref<{primary: string, bg: string}[]>(JSON.parse(localStorage.getItem('colorHistory') || '[]'))

    const settings = ref<UserSettings>({
        reminderEnabled: true,
        reminderTime: '21:00',
        reminderFrequency: 'daily',
        appLockEnabled: false,
        appLockType: null,
        theme: 'system',
        startOfWeek: (Number(localStorage.getItem('startOfWeek')) || 1) as 0 | 1,
    })

    const isLoggedIn = computed(() => !!accessToken.value)
    const displayName = computed(() => profile.value?.nickname || user.value?.nickname || user.value?.username || 'User')

    function setThemeColor(id: string) {
        themeColor.value = id
        localStorage.setItem('themeColor', id)
    }

    function addToHistory(primary: string, bg: string) {
        const filtered = colorHistory.value.filter(c => !(c.primary === primary && c.bg === bg))
        colorHistory.value = [{ primary, bg }, ...filtered].slice(0, 8)
        localStorage.setItem('colorHistory', JSON.stringify(colorHistory.value))
    }

    function updateCustomColors(primary: string, bg: string) {
        customColors.value = { primary, bg }
    }

    function setCustomColors(primary: string, bg: string) {
        customColors.value = { primary, bg }
        localStorage.setItem('customPrimary', primary)
        localStorage.setItem('customBg', bg)
        themeColor.value = 'custom'
        localStorage.setItem('themeColor', 'custom')
        addToHistory(primary, bg)
    }

    function setAccessToken(token: string | null) {
        accessToken.value = token
        token ? saveToken(token) : removeToken()
    }

    function setStartOfWeek(value: 0 | 1) {
        settings.value.startOfWeek = value
        localStorage.setItem('startOfWeek', String(value))
    }

    function setLocale(l: string) {
        localStorage.setItem('locale', l)
        window.location.reload()
    }

    async function updateSettings(data: Partial<UserSettings>) {
        try {
            const updated = await api.user.updateSettings(data)
            settings.value = { ...settings.value, ...updated }
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
            return updated
        } catch (e) {
            console.error('Failed to update settings', e)
            // 乐观更新，如果 API 失败，至少本地是生效的（或者在这里处理回滚）
            settings.value = { ...settings.value, ...data }
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
        }
    }

    function init() {
        const t = getToken()
        if (t) accessToken.value = t
        const u = localStorage.getItem('userInfo')
        const p = localStorage.getItem('userProfile')
        const s = localStorage.getItem('userSettings')
        if (u) try { user.value = JSON.parse(u) } catch {}
        if (p) try { profile.value = JSON.parse(p) } catch {}
        if (s) try { settings.value = JSON.parse(s) } catch {}
    }

    async function login(account: string, password: string) {
        const res = await api.auth.login({ account, password })
        setAccessToken(res.accessToken)
        user.value = res.user as unknown as User
        localStorage.setItem('userInfo', JSON.stringify(res.user))
        return res.user
    }

    async function register(email: string, username: string, password: string, nickname: string) {
        const res = await api.auth.register({ email, username, password, nickname })
        setAccessToken(res.accessToken)
        user.value = res.user as unknown as User
        localStorage.setItem('userInfo', JSON.stringify(res.user))
        return res.user
    }

    async function fetchProfile() {
        try {
            const data = await api.user.getProfile()
            profile.value = data as unknown as UserProfile
            localStorage.setItem('userProfile', JSON.stringify(data))
            return data
        } catch (e) {
            throw e
        }
    }

    async function updateProfile(data: Partial<UserProfile>) {
        const updated = await api.user.updateProfile(data)
        profile.value = updated as unknown as UserProfile
        localStorage.setItem('userProfile', JSON.stringify(updated))
        return updated
    }

    function logout() {
        user.value = null; profile.value = null; accessToken.value = null
        localStorage.clear(); removeToken(); window.location.reload()
    }

    return {
        user, profile, themeColor, customColors, colorHistory, accessToken, isLoggedIn, displayName, settings,
        setThemeColor, setCustomColors, updateCustomColors, addToHistory,
        init, login, register, logout,
        fetchProfile, updateProfile,
        setStartOfWeek, setLocale, updateSettings,
    }
})
