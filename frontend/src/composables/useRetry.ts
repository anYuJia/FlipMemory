/**
 * 重试机制 Composable
 */

import { ref } from 'vue'
import { isRetryableError } from '@/utils/errorHandler'

export interface RetryOptions {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
}

/**
 * 指数退避重试
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
    } = options

    let lastError: any
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            // 检查是否可重试
            if (!isRetryableError(error)) {
                throw error
            }

            // 最后一次尝试失败，抛出错误
            if (attempt === maxRetries) {
                throw error
            }

            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, delay))

            // 计算下一次延迟
            delay = Math.min(delay * backoffMultiplier, maxDelay)
        }
    }

    throw lastError
}

/**
 * 使用重试机制
 */
export function useRetry(options: RetryOptions = {}) {
    const isRetrying = ref(false)
    const retryCount = ref(0)

    async function retry<T>(fn: () => Promise<T>): Promise<T> {
        isRetrying.value = true
        retryCount.value = 0

        try {
            return await retryWithBackoff(fn, options)
        } finally {
            isRetrying.value = false
        }
    }

    return {
        isRetrying,
        retryCount,
        retry,
    }
}
