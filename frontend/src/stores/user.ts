import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { User, UserSettings } from '@/types'
import api, { AppError } from '@/services/api'
import { hashPin as cryptoHashPin, verifyPin as cryptoVerifyPin } from '@/services/encryptionService'
import { logger } from '@/services/logger'
import { saveToken, getToken, removeToken } from '@/services/tokenManager'

// 用户资料类型 - 导出供其他组件使用
export interface UserProfile {
    id: string
    email: string
    username: string
    nickname: string | null
    avatar: string | null
    avatarUrl: string | null
    gender: 'male' | 'female' | 'other' | null
    birthday: string | null
    profession: string | null
    interests: string[]
    timezone: string
    createdAt: string
    updatedAt: string
}

export const useUserStore = defineStore('user', () => {
    // ===== State =====
    const user = ref<User | null>(null)
    const profile = ref<UserProfile | null>(null)
    const settings = ref<UserSettings>({
        reminderEnabled: true,
        reminderTime: '21:00',
        reminderFrequency: 'daily',
        appLockEnabled: false,
        appLockType: null,
        theme: 'system',
        startOfWeek: 1,
    })
    const accessToken = ref<string | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // ===== Getters =====
    const isLoggedIn = computed(() => !!user.value && !!accessToken.value)

    const displayName = computed(() => {
        if (profile.value?.nickname) return profile.value.nickname
        if (!user.value) return '游客'
        return user.value.nickname || user.value.email.split('@')[0]
    })

    const theme = computed(() => settings.value.theme)

    // ===== 认证相关 =====
    async function login(account: string, password: string) {
        isLoading.value = true
        error.value = null

        try {
            const response = await api.auth.login({ account, password })
            // 先确保存储 Token
            setAccessToken(response.accessToken)
            user.value = response.user
            
            // 异步加载资料和设置，但不阻塞登录成功流程
            setTimeout(() => {
                fetchProfile().catch(e => logger.warn('Optional profile fetch failed', 'UserStore', e))
                fetchSettings().catch(e => logger.warn('Optional settings fetch failed', 'UserStore', e))
            }, 100)
            
            return response.user
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '登录失败'
            }
            throw e
        } finally {
            isLoading.value = false
        }
    }

    async function register(email: string, username: string, password: string, nickname?: string) {
        isLoading.value = true
        error.value = null

        try {
            const response = await api.auth.register({ email, username, password, nickname })
            // 先确保存储 Token
            setAccessToken(response.accessToken)
            user.value = response.user
            
            // 异步加载
            setTimeout(() => {
                fetchProfile().catch(() => {})
                fetchSettings().catch(() => {})
            }, 100)
            
            return response.user
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '注册失败'
            }
            throw e
        } finally {
            isLoading.value = false
        }
    }

    function logout() {
        user.value = null
        profile.value = null
        accessToken.value = null
        removeToken()
    }

    // ===== 用户资料相关 =====
    async function fetchProfile() {
        isLoading.value = true
        error.value = null

        try {
            profile.value = await api.user.getProfile()
            return profile.value
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '加载失败'
            }
            return null
        } finally {
            isLoading.value = false
        }
    }

    async function updateProfile(data: {
        nickname?: string
        gender?: 'male' | 'female' | 'other' | null
        birthday?: string | null
        profession?: string | null
        interests?: string[]
        avatar?: string | null
    }) {
        isLoading.value = true
        error.value = null

        try {
            profile.value = await api.user.updateProfile(data)
            return profile.value
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '更新失败'
            }
            return null
        } finally {
            isLoading.value = false
        }
    }

    // ===== 用户设置相关 =====
    async function fetchSettings() {
        isLoading.value = true
        error.value = null

        try {
            const serverSettings = await api.user.getSettings()
            settings.value = { ...settings.value, ...serverSettings }
            return settings.value
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '加载失败'
            }
            return null
        } finally {
            isLoading.value = false
        }
    }

    async function updateSettings(newSettings: Partial<UserSettings>) {
        isLoading.value = true
        error.value = null

        try {
            const serverSettings = await api.user.updateSettings(newSettings)
            settings.value = { ...settings.value, ...serverSettings }
            // 本地也保存一份用于快速恢复
            localStorage.setItem('userSettings', JSON.stringify(settings.value))
            return settings.value
        } catch (e) {
            if (e instanceof AppError) {
                error.value = e.message
            } else {
                error.value = e instanceof Error ? e.message : '更新失败'
            }
            return null
        } finally {
            isLoading.value = false
        }
    }

    // 便捷方法
    function setTheme(theme: 'light' | 'dark' | 'system') {
        updateSettings({ theme })
    }

    function setStartOfWeek(day: 0 | 1) {
        updateSettings({ startOfWeek: day })
    }

    function toggleReminder() {
        updateSettings({ reminderEnabled: !settings.value.reminderEnabled })
    }

    // ===== 隐私锁相关 =====

    // 本地 PIN 哈希存储键
    const LOCAL_PIN_HASH_KEY = 'flipMemory_pinHash'

    /**
     * 验证 PIN（优先本地验证，失败时回退到服务器）
     */
    async function verifyPin(pin: string): Promise<boolean> {
        // 先尝试本地验证
        const localHash = localStorage.getItem(LOCAL_PIN_HASH_KEY)
        if (localHash) {
            const isValid = await cryptoVerifyPin(pin, localHash)
            if (isValid) return true
        }

        // 本地验证失败，尝试服务器验证
        try {
            const result = await api.user.verifyPin(pin)
            return result.verified
        } catch {
            return false
        }
    }

    /**
     * 设置 PIN（同时保存到本地和服务器）
     */
    async function setPin(pin: string | null) {
        if (pin) {
            // 本地保存哈希
            const hash = await cryptoHashPin(pin)
            localStorage.setItem(LOCAL_PIN_HASH_KEY, hash)
        } else {
            // 清除本地哈希
            localStorage.removeItem(LOCAL_PIN_HASH_KEY)
        }

        // 同步到服务器
        await updateSettings({ appLockPin: pin } as any)
    }

    // ===== Token 管理 =====
    function setUser(userData: User | null) {
        user.value = userData
    }

    function setAccessToken(token: string | null) {
        accessToken.value = token
        if (token) {
            saveToken(token)
        } else {
            removeToken()
        }
    }

    // ===== 初始化 =====
    function init() {
        // 从存储恢复 token
        const savedToken = getToken()
        if (savedToken) {
            accessToken.value = savedToken
        }

        // 加载本地设置（用于快速显示，后续从服务器同步）
        const savedSettings = localStorage.getItem('userSettings')
        if (savedSettings) {
            try {
                settings.value = { ...settings.value, ...JSON.parse(savedSettings) }
            } catch (e) {
                logger.warn('Failed to parse saved settings', 'UserStore', e)
            }
        }

        // 应用主题
        applyTheme(settings.value.theme)
    }

    // 监听主题变化
    watch(() => settings.value.theme, (newTheme) => {
        applyTheme(newTheme)
    })

    return {
        // State
        user,
        profile,
        settings,
        accessToken,
        isLoading,
        error,
        // Getters
        isLoggedIn,
        displayName,
        theme,
        // 认证
        login,
        register,
        logout,
        // 用户资料
        fetchProfile,
        updateProfile,
        // 用户设置
        fetchSettings,
        updateSettings,
        setTheme,
        setStartOfWeek,
        toggleReminder,
        // 隐私锁
        verifyPin,
        setPin,
        // Token
        setUser,
        setAccessToken,
        // 初始化
        init,
    }
})

// 应用主题
function applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
    } else {
        root.classList.toggle('dark', theme === 'dark')
    }
}
