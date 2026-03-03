/**
 * 加载状态管理 Composable
 */

import { ref, computed, readonly } from 'vue'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingInfo {
    state: LoadingState
    message?: string
    progress?: number
    error?: Error
    startTime?: number
    endTime?: number
}

/**
 * 使用加载状态
 */
export function useLoading(initialMessage?: string) {
    const state = ref<LoadingState>('idle')
    const message = ref(initialMessage || '')
    const progress = ref(0)
    const error = ref<Error | null>(null)
    const startTime = ref<number | null>(null)
    const endTime = ref<number | null>(null)

    // 计算属性
    const isLoading = computed(() => state.value === 'loading')
    const isSuccess = computed(() => state.value === 'success')
    const isError = computed(() => state.value === 'error')
    const isIdle = computed(() => state.value === 'idle')

    // 加载时长
    const duration = computed(() => {
        if (startTime.value && endTime.value) {
            return endTime.value - startTime.value
        }
        if (startTime.value) {
            return Date.now() - startTime.value
        }
        return 0
    })

    // 开始加载
    function start(msg?: string) {
        state.value = 'loading'
        message.value = msg || message.value
        progress.value = 0
        error.value = null
        startTime.value = Date.now()
        endTime.value = null
    }

    // 更新进度
    function updateProgress(value: number, msg?: string) {
        progress.value = Math.min(100, Math.max(0, value))
        if (msg) message.value = msg
    }

    // 加载成功
    function success(msg?: string) {
        state.value = 'success'
        message.value = msg || '加载完成'
        progress.value = 100
        endTime.value = Date.now()
    }

    // 加载失败
    function fail(err: Error | string, msg?: string) {
        state.value = 'error'
        error.value = err instanceof Error ? err : new Error(err)
        message.value = msg || error.value.message
        endTime.value = Date.now()
    }

    // 重置状态
    function reset() {
        state.value = 'idle'
        message.value = ''
        progress.value = 0
        error.value = null
        startTime.value = null
        endTime.value = null
    }

    // 包装异步函数
    async function wrap<T>(
        fn: () => Promise<T>,
        options?: {
            startMessage?: string
            successMessage?: string
            errorMessage?: string
        }
    ): Promise<T> {
        start(options?.startMessage)
        try {
            const result = await fn()
            success(options?.successMessage)
            return result
        } catch (err) {
            fail(err as Error, options?.errorMessage)
            throw err
        }
    }

    return {
        // 状态
        state: readonly(state),
        message: readonly(message),
        progress: readonly(progress),
        error: readonly(error),
        duration,

        // 计算属性
        isLoading,
        isSuccess,
        isError,
        isIdle,

        // 方法
        start,
        updateProgress,
        success,
        fail,
        reset,
        wrap,
    }
}

/**
 * 使用多个加载状态
 */
export function useMultiLoading<T extends string>(keys: T[]) {
    const loadings = new Map<T, ReturnType<typeof useLoading>>()

    for (const key of keys) {
        loadings.set(key, useLoading())
    }

    function get(key: T) {
        return loadings.get(key)!
    }

    const isAnyLoading = computed(() => {
        for (const loading of loadings.values()) {
            if (loading.isLoading.value) return true
        }
        return false
    })

    const hasAnyError = computed(() => {
        for (const loading of loadings.values()) {
            if (loading.isError.value) return true
        }
        return false
    })

    return {
        get,
        isAnyLoading,
        hasAnyError,
    }
}

/**
 * 使用全局加载状态
 */
const globalLoading = useLoading()

export function useGlobalLoading() {
    return globalLoading
}

/**
 * 使用页面加载状态
 */
export function usePageLoading() {
    const loading = useLoading()

    // 显示页面加载进度条
    function showPageLoading(message?: string) {
        loading.start(message)
        document.body.classList.add('page-loading')
    }

    // 隐藏页面加载进度条
    function hidePageLoading() {
        loading.success()
        document.body.classList.remove('page-loading')
    }

    return {
        ...loading,
        showPageLoading,
        hidePageLoading,
    }
}

/**
 * 使用按钮加载状态
 */
export function useButtonLoading() {
    const loading = useLoading()

    const buttonProps = computed(() => ({
        disabled: loading.isLoading.value,
        class: {
            'is-loading': loading.isLoading.value,
        },
    }))

    return {
        ...loading,
        buttonProps,
    }
}
