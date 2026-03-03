/**
 * 错误处理工具测试
 */

import { describe, it, expect } from 'vitest'
import {
    AppError,
    ErrorType,
    isRetryableError,
    getUserFriendlyMessage,
    classifyError,
    createAppError,
} from '@/utils/errorHandler'

describe('errorHandler', () => {
    describe('AppError', () => {
        it('should create an AppError with message and code', () => {
            const error = new AppError('Test error', 500)
            expect(error.message).toBe('Test error')
            expect(error.code).toBe(500)
            expect(error.name).toBe('AppError')
        })

        it('should support retryable flag', () => {
            const error = new AppError('Test error', 500, null, true)
            expect(error.isRetryable).toBe(true)
        })
    })

    describe('isRetryableError', () => {
        it('should return true for retryable errors', () => {
            const error = new AppError('Network error', 0, null, true)
            expect(isRetryableError(error)).toBe(true)
        })

        it('should return false for non-retryable errors', () => {
            const error = new AppError('Auth error', 401, null, false)
            expect(isRetryableError(error)).toBe(false)
        })
    })

    describe('getUserFriendlyMessage', () => {
        it('should return message from AppError', () => {
            const error = new AppError('Custom message', 500)
            expect(getUserFriendlyMessage(error)).toBe('Custom message')
        })

        it('should return message from Error', () => {
            const error = new Error('Test error')
            expect(getUserFriendlyMessage(error)).toBe('Test error')
        })

        it('should return default message for unknown errors', () => {
            expect(getUserFriendlyMessage({})).toBe('发生未知错误，请稍后重试')
        })
    })

    describe('classifyError', () => {
        it('should classify 401 as UNAUTHORIZED', () => {
            const error = new AppError('Unauthorized', 401)
            expect(classifyError(error)).toBe(ErrorType.UNAUTHORIZED)
        })

        it('should classify 404 as NOT_FOUND', () => {
            const error = new AppError('Not found', 404)
            expect(classifyError(error)).toBe(ErrorType.NOT_FOUND)
        })

        it('should classify 500+ as INTERNAL_ERROR', () => {
            const error = new AppError('Server error', 500)
            expect(classifyError(error)).toBe(ErrorType.INTERNAL_ERROR)
        })

        it('should classify TypeError with fetch as NETWORK_ERROR', () => {
            const error = new TypeError('Failed to fetch')
            expect(classifyError(error)).toBe(ErrorType.NETWORK_ERROR)
        })
    })

    describe('createAppError', () => {
        it('should create an AppError with default values', () => {
            const error = createAppError('Test error')
            expect(error.message).toBe('Test error')
            expect(error.code).toBe(500)
        })

        it('should create an AppError with custom type', () => {
            const error = createAppError('Network error', ErrorType.NETWORK_ERROR, 0)
            expect(error.code).toBe(0)
        })
    })
})
