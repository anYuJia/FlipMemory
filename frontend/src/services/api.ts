// API 服务配置
import { buildApiUrl } from '@/utils/urlBuilder'
import { AppError, logError } from '@/utils/errorHandler'
import { getToken, removeToken, isTokenExpired } from '@/services/tokenManager'
import { logger } from '@/services/logger'
import { performanceMonitor } from '@/services/performanceMonitor'
import router from '@/router'
import type { ApiResponse } from '@/types'
import i18n from '@/i18n'

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 30000

// 重试配置
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
}

// 清除 token 并跳转到登录页
function handleUnauthorized() {
    removeToken()
    // 使用 Vue Router 跳转到登录页面
    if (router.currentRoute.value.name !== 'auth') {
        router.push({ name: 'auth' })
    }
}

// 计算指数退避延迟
function getRetryDelay(attempt: number): number {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 1000
    return Math.min(delay + jitter, RETRY_CONFIG.maxDelay)
}

// 判断是否应该重试
function shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= RETRY_CONFIG.maxRetries) return false

    if (error instanceof AppError) {
        return error.isRetryable
    }

    // 网络错误和超时应该重试
    if (error instanceof TypeError) {
        return true
    }

    return false
}

// 延迟函数
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 创建带超时的 fetch
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timeoutId)
    }
}

// 通用请求函数
async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
): Promise<T> {
    const startTime = performance.now()

    // 检查 token 是否过期
    if (isTokenExpired()) {
        logger.warn('Token expired, redirecting to login', 'API')
        handleUnauthorized()
        throw new AppError(i18n.global.t('errors.token_expired'), 401, null, false)
    }

    // 修复：每次请求都动态获取最新的 Token
    const token = getToken()

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const url = buildApiUrl(endpoint)

    try {
        logger.debug(`API Request: ${options.method || 'GET'} ${endpoint}`, 'API')

        const response = await fetchWithTimeout(url, {
            ...options,
            headers,
        })

        const json = (await response.json()) as ApiResponse<T>
        const duration = performance.now() - startTime

        // 记录 API 响应时间
        performanceMonitor.recordApiCall(endpoint, duration)

        // 处理 401 未授权错误
        if (response.status === 401) {
            logger.warn('Unauthorized response, redirecting to login', 'API')
            handleUnauthorized()
            throw new AppError(i18n.global.t('errors.token_expired'), 401, json, false)
        }

        if (!response.ok || json.code !== 0) {
            logger.warn(`API Error: ${endpoint} - ${json.message || response.status}`, 'API', { code: json.code })
            const isRetryable = response.status >= 500 || response.status === 408 || response.status === 429
            throw new AppError(
                json.message || 'Request failed',
                json.code || response.status,
                json,
                isRetryable
            )
        }

        return json.data
    } catch (error) {
        // 检查是否应该重试
        if (shouldRetry(error, retryCount)) {
            const retryDelay = getRetryDelay(retryCount)
            logger.info(`Retrying request to ${endpoint} in ${retryDelay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`, 'API')
            await delay(retryDelay)
            return request<T>(endpoint, options, retryCount + 1)
        }

        if (error instanceof AppError) {
            throw error
        }

        // 处理网络错误和超时
        if (error instanceof TypeError) {
            if (error.message.includes('Failed to fetch')) {
                logger.error('Network connection failed', 'API', { endpoint })
                throw new AppError(i18n.global.t('common.network_error'), 0, error, true)
            }
            if (error.message.includes('AbortError')) {
                logger.warn('Request timeout', 'API', { endpoint })
                throw new AppError(i18n.global.t('common.timeout_error'), 408, error, true)
            }
        }

        // 其他错误
        logger.error(`API request failed: ${endpoint}`, 'API', error)
        logError(error, `API request to ${endpoint}`)
        throw new AppError(i18n.global.t('errors.request_failed'), 500, error, true)
    }
}

// 类型定义
interface AuthResponse {
    user: {
        id: string
        email: string
        nickname: string
        avatar?: string | null
    }
    accessToken: string
}

interface UserProfile {
    id: string
    email: string
    nickname: string
    gender?: 'male' | 'female' | 'other' | null
    birthday?: string | null
    profession?: string | null
    interests?: string[]
    avatar?: string | null
}

interface UserSettings {
    reminderEnabled: boolean
    reminderTime?: string
    reminderFrequency?: 'daily' | 'weekly'
    appLockEnabled: boolean
    appLockType?: 'pin' | 'biometric' | null
    theme: 'light' | 'dark' | 'system'
    startOfWeek: 0 | 1
}

interface UploadResponse {
    uploadUrl: string
    key: string
}

interface PhotoMetadata {
    takenAt?: string | null
    latitude?: number | null
    longitude?: number | null
    width?: number | null
    height?: number | null
}

// API 方法
export const api = {
    // ===== 认证 =====
    auth: {
        register: (data: { email: string; username: string; password: string; nickname?: string }) =>
            request<AuthResponse>('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        login: (data: { account: string; password: string }) =>
            request<AuthResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        checkUsername: (username: string) =>
            request<{ available: boolean }>(`/auth/check-username?username=${encodeURIComponent(username)}`, {
                method: 'GET',
            }),

        me: () => request<UserProfile>('/auth/me'),
    },

    // ===== 用户 =====
    user: {
        getProfile: () => request<UserProfile>('/user/profile'),

        updateProfile: (data: Partial<UserProfile>) =>
            request<UserProfile>('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(data),
            }),

        getSettings: () => request<UserSettings>('/user/settings'),

        updateSettings: (data: Partial<UserSettings>) =>
            request<UserSettings>('/user/settings', {
                method: 'PUT',
                body: JSON.stringify(data),
            }),

        verifyPin: (pin: string) =>
            request<{ verified: boolean }>('/user/verify-pin', {
                method: 'POST',
                body: JSON.stringify({ pin }),
            }),

        getStats: () => request<any>('/user/stats'),
    },

    // ===== 记忆 =====
    memories: {
        getCalendar: (year: number, month: number) =>
            request<any>(`/memories/calendar/${year}/${month}`),

        getByDate: (date: string) =>
            request<any>(`/memories/${date}`),

        create: (data: {
            date: string
            content?: string
            mood?: string
            photoKeys?: string[]
            tags?: string[]
        }) => request<any>('/memories', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

        update: (date: string, data: {
            content?: string
            mood?: string
            isPrivate?: boolean
            tags?: string[]
        }) => request<any>(`/memories/${date}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

        delete: (date: string) =>
            request<void>(`/memories/${date}`, {
                method: 'DELETE',
            }),

        getFlashback: () =>
            request<any>('/memories/flashback'),

        getStats: (range?: string, year?: number, month?: number, week?: number) => {
            const params = new URLSearchParams()
            if (range) params.append('range', range)
            if (year) params.append('year', String(year))
            if (month) params.append('month', String(month))
            if (week) params.append('week', String(week))
            return request<any>(`/memories/stats?${params.toString()}`)
        },

        search: (params: {
            q?: string
            mood?: string
            from?: string
            to?: string
            limit?: number
        }) => {
            const searchParams = new URLSearchParams()
            if (params.q) searchParams.append('q', params.q)
            if (params.mood) searchParams.append('mood', params.mood)
            if (params.from) searchParams.append('from', params.from)
            if (params.to) searchParams.append('to', params.to)
            if (params.limit) searchParams.append('limit', String(params.limit))
            return request<any[]>(`/memories/search?${searchParams.toString()}`)
        },

        getRecent: (limit = 10) =>
            request<any[]>(`/memories/recent?limit=${limit}`),

        getAnniversary: () =>
            request<any[]>('/memories/anniversary'),
    },

    // ===== 上传 =====
    upload: {
        getPresignedUrl: (filename: string, mimeType: string) =>
            request<UploadResponse>('/upload/presign', {
                method: 'POST',
                body: JSON.stringify({ filename, mimeType }),
            }),

        confirm: (key: string, metadata?: PhotoMetadata) =>
            request<{ photo: any }>('/upload/complete', {
                method: 'POST',
                body: JSON.stringify({ key, ...metadata }),
            }),
    },
}

export { AppError }
export default api
