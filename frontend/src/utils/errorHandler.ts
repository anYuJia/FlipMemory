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
export enum ErrorType {
    // 网络错误
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    OFFLINE = 'OFFLINE',

    // 认证错误
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',

    // 业务错误
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    VALIDATION_ERROR = 'VALIDATION_ERROR',

    // 系统错误
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误信息映射
 */
const errorMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
    [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
    [ErrorType.OFFLINE]: '当前离线，部分功能不可用',
    [ErrorType.UNAUTHORIZED]: '登录已过期，请重新登录',
    [ErrorType.FORBIDDEN]: '您没有权限执行此操作',
    [ErrorType.TOKEN_EXPIRED]: '登录已过期，请重新登录',
    [ErrorType.NOT_FOUND]: '请求的资源不存在',
    [ErrorType.CONFLICT]: '数据冲突，请刷新后重试',
    [ErrorType.VALIDATION_ERROR]: '输入数据不合法',
    [ErrorType.INTERNAL_ERROR]: '服务器错误，请稍后重试',
    [ErrorType.UNKNOWN_ERROR]: '发生未知错误，请稍后重试',
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
            return errorMessages[ErrorType.NETWORK_ERROR]
        }
        return error.message
    }

    return errorMessages[ErrorType.UNKNOWN_ERROR]
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
