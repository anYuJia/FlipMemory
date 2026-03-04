/**
 * 统一的错误处理工具
 */

export class AppError extends Error {
    code: number
    data?: any
    isRetryable: boolean

    constructor(
        message: string,
        code: number = 500,
        data?: any,
        isRetryable: boolean = false
    ) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.data = data
        this.isRetryable = isRetryable
    }
}

/**
 * 错误类型定义
 */
export const ErrorType = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    OFFLINE: 'OFFLINE',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorType = typeof ErrorType[keyof typeof ErrorType]

/**
 * 错误信息映射
 */
const getErrorMessage = (type: ErrorType): string => {
    const keyMap: Record<ErrorType, string> = {
        [ErrorType.NETWORK_ERROR]: 'common.network_error',
        [ErrorType.TIMEOUT]: 'common.timeout_error',
        [ErrorType.OFFLINE]: 'errors.offline',
        [ErrorType.UNAUTHORIZED]: 'errors.unauthorized',
        [ErrorType.FORBIDDEN]: 'errors.forbidden',
        [ErrorType.TOKEN_EXPIRED]: 'errors.token_expired',
        [ErrorType.NOT_FOUND]: 'errors.not_found',
        [ErrorType.CONFLICT]: 'errors.conflict',
        [ErrorType.VALIDATION_ERROR]: 'errors.validation',
        [ErrorType.INTERNAL_ERROR]: 'errors.internal',
        [ErrorType.UNKNOWN_ERROR]: 'errors.unknown',
    }
    return i18n.global.t(keyMap[type])
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: any): boolean {
    if (error instanceof AppError) {
        return error.isRetryable
    }

    // 网络错误、超时、冲突等可重试
    const retryableTypes = [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT,
        ErrorType.CONFLICT,
    ]

    return retryableTypes.includes(error.type)
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: any): string {
    if (error instanceof AppError) {
        return error.message
    }

    if (error instanceof Error) {
        // 检查是否是网络错误
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return getErrorMessage(ErrorType.NETWORK_ERROR)
        }
        return error.message
    }

    return getErrorMessage(ErrorType.UNKNOWN_ERROR)
}

/**
 * 分类错误
 */
export function classifyError(error: any): ErrorType {
    if (error instanceof AppError) {
        if (error.code === 401) return ErrorType.UNAUTHORIZED
        if (error.code === 403) return ErrorType.FORBIDDEN
        if (error.code === 404) return ErrorType.NOT_FOUND
        if (error.code === 409) return ErrorType.CONFLICT
        if (error.code === 422) return ErrorType.VALIDATION_ERROR
        if (error.code >= 500) return ErrorType.INTERNAL_ERROR
    }

    if (error instanceof TypeError) {
        if (error.message.includes('fetch')) {
            return ErrorType.NETWORK_ERROR
        }
    }

    if (error instanceof Error) {
        if (error.message.includes('timeout')) {
            return ErrorType.TIMEOUT
        }
        if (error.message.includes('offline')) {
            return ErrorType.OFFLINE
        }
    }

    return ErrorType.UNKNOWN_ERROR
}

/**
 * 记录错误
 */
export function logError(error: any, context?: string): void {
    const errorType = classifyError(error)
    const message = getUserFriendlyMessage(error)

    console.error(`[${errorType}${context ? ` - ${context}` : ''}] ${message}`, error)

    // TODO: 集成错误追踪服务（如 Sentry）
}

/**
 * 创建应用错误
 */
export function createAppError(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    code: number = 500,
    data?: any
): AppError {
    const isRetryable = isRetryableError({ type })
    return new AppError(message, code, data, isRetryable)
}
import i18n from '@/i18n'
