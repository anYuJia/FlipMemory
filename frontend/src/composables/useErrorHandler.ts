/**
 * 全局错误处理 Composable
 */

import { ref } from 'vue'
import { getUserFriendlyMessage, logError, type ErrorType } from '@/utils/errorHandler'

export interface ErrorInfo {
    message: string
    type?: ErrorType
    code?: number
    timestamp: number
    retryable?: boolean
}

const errors = ref<ErrorInfo[]>([])
const currentError = ref<ErrorInfo | null>(null)

/**
 * 添加错误
 */
export function addError(error: any, context?: string): ErrorInfo {
    const message = getUserFriendlyMessage(error)
    const errorInfo: ErrorInfo = {
        message,
        code: error.code,
        type: error.type,
        timestamp: Date.now(),
        retryable: error.isRetryable,
    }

    errors.value.push(errorInfo)
    currentError.value = errorInfo

    logError(error, context)

    // 5秒后自动清除
    setTimeout(() => {
        removeError(errorInfo)
    }, 5000)

    return errorInfo
}

/**
 * 移除错误
 */
export function removeError(errorInfo: ErrorInfo): void {
    const index = errors.value.indexOf(errorInfo)
    if (index > -1) {
        errors.value.splice(index, 1)
    }
    if (currentError.value === errorInfo) {
        currentError.value = null
    }
}

/**
 * 清除所有错误
 */
export function clearErrors(): void {
    errors.value = []
    currentError.value = null
}

/**
 * 使用全局错误处理
 */
export function useErrorHandler() {
    return {
        errors,
        currentError,
        addError,
        removeError,
        clearErrors,
    }
}
