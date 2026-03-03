// 用户相关类型定义

export interface User {
    id: string
    email: string
    username: string
    nickname: string | null
    avatar: string | null
    avatarUrl: string | null
    timezone: string
    createdAt: string
    updatedAt: string
}

export interface UserSettings {
    // 提醒设置
    reminderEnabled: boolean
    reminderTime: string       // HH:mm 格式
    reminderFrequency: 'daily' | 'weekly'

    // 隐私设置
    appLockEnabled: boolean
    appLockType: 'pin' | 'biometric' | null

    // 显示设置
    theme: 'light' | 'dark' | 'system'
    startOfWeek: 0 | 1         // 0 = 周日, 1 = 周一
}

export interface LoginInput {
    account: string
    password: string
}

export interface RegisterInput {
    email: string
    username: string
    password: string
    nickname?: string
}

export interface AuthResponse {
    user: User
    accessToken: string
    refreshToken: string
}
