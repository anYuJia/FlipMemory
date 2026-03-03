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
        startOfWeek: 1,
        locale: localStorage.getItem('locale') || 'zh-CN',
    })

    const isLoggedIn = computed(() => !!accessToken.value)
    const displayName = computed(() => profile.value?.nickname || user.value?.nickname || user.value?.username || 'User')

    function setThemeColor(id: string) {
        themeColor.value = id
        localStorage.setItem('themeColor', id)
    }

    function addToHistory(primary: string, bg: string) {
        // 过滤掉当前要添加的，避免重复并保持顺序
        const filtered = colorHistory.value.filter(c => !(c.primary === primary && c.bg === bg))
        // 将新色值放到最前面，并保留最近 8 个
        colorHistory.value = [{ primary, bg }, ...filtered].slice(0, 8)
        localStorage.setItem('colorHistory', JSON.stringify(colorHistory.value))
    }

    // 仅更新内存中的颜色值，不触碰本地存储 (用于实时预览)
    function updateCustomColors(primary: string, bg: string) {
        customColors.value = { primary, bg }
    }

    // 正式设置自定义颜色：更新状态、同步本地存储、加入历史记录
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
        user, profile, themeColor, customColors, colorHistory, accessToken, isLoggedIn, displayName, settings,
        setThemeColor, setCustomColors, updateCustomColors, addToHistory, init, login, logout, setLocale: (l:string) => { localStorage.setItem('locale', l); window.location.reload() }
    }
})
