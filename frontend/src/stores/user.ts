import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User, UserSettings } from '@/types'
import api, { AppError } from '@/services/api'
import { logger } from '@/services/logger'
import { saveToken, getToken, removeToken } from '@/services/tokenManager'

export const useUserStore = defineStore('user', () => {
    const user = ref<User | null>(null)
    const profile = ref<any | null>(null)
    const accessToken = ref<string | null>(null)
    
    // 主题色 ID，默认为 'auto' (时光流转)
    const themeColor = ref(localStorage.getItem('themeColor') || 'auto')

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

    const isLoggedIn = computed(() => !!accessToken.value)
    const displayName = computed(() => profile.value?.nickname || user.value?.nickname || user.value?.username || 'User')

    function setThemeColor(id: string) {
        themeColor.value = id
        localStorage.setItem('themeColor', id)
    }

    function setAccessToken(token: string | null) {
        accessToken.value = token
        token ? saveToken(token) : removeToken()
    }

    function init() {
        const t = getToken()
        if (t) accessToken.value = t
        const u = localStorage.getItem('userInfo')
        const p = localStorage.getItem('userProfile')
        if (u) try { user.value = JSON.parse(u) } catch(e) {}
        if (p) try { profile.value = JSON.parse(p) } catch(e) {}
    }

    async function login(account: string, password: string) {
        try {
            const res = await api.auth.login({ account, password })
            setAccessToken(res.accessToken)
            user.value = res.user
            localStorage.setItem('userInfo', JSON.stringify(res.user))
            return res.user
        } catch (e) { throw e }
    }

    function logout() {
        user.value = null; profile.value = null; accessToken.value = null
        localStorage.clear(); removeToken(); window.location.reload()
    }

    return { 
        user, profile, themeColor, accessToken, isLoggedIn, displayName, settings,
        setThemeColor, init, login, logout, setLocale: (l:string) => { localStorage.setItem('locale', l); window.location.reload() }
    }
})
