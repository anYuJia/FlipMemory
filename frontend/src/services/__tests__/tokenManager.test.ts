/**
 * Token 管理器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    saveToken,
    getToken,
    saveRefreshToken,
    getRefreshToken,
    isTokenExpired,
    removeToken,
    clearAuth,
    isAuthenticated,
} from '@/services/tokenManager'

describe('tokenManager', () => {
    beforeEach(() => {
        // 清除 sessionStorage 和 localStorage
        sessionStorage.clear()
        localStorage.clear()
    })

    afterEach(() => {
        sessionStorage.clear()
        localStorage.clear()
    })

    describe('saveToken', () => {
        it('should save token to storage', () => {
            saveToken('test-token')
            const stored = sessionStorage.getItem('accessToken')
            expect(stored).toBe('test-token')
        })

        it('should save token expiry time', () => {
            saveToken('test-token', 3600) // 1 hour
            const expiry = sessionStorage.getItem('tokenExpiry')
            expect(expiry).toBeDefined()
            expect(parseInt(expiry!)).toBeGreaterThan(Date.now())
        })
    })

    describe('getToken', () => {
        it('should retrieve saved token', () => {
            saveToken('test-token')
            const token = getToken()
            expect(token).toBe('test-token')
        })

        it('should return null if no token saved', () => {
            const token = getToken()
            expect(token).toBeNull()
        })

        it('should return null if token is expired', () => {
            // 保存一个已过期的 token
            sessionStorage.setItem('accessToken', 'test-token')
            sessionStorage.setItem('tokenExpiry', String(Date.now() - 1000))

            const token = getToken()
            expect(token).toBeNull()
        })
    })

    describe('saveRefreshToken', () => {
        it('should save refresh token', () => {
            saveRefreshToken('refresh-token')
            const stored = sessionStorage.getItem('refreshToken')
            expect(stored).toBe('refresh-token')
        })
    })

    describe('getRefreshToken', () => {
        it('should retrieve refresh token', () => {
            saveRefreshToken('refresh-token')
            const token = getRefreshToken()
            expect(token).toBe('refresh-token')
        })

        it('should return null if no refresh token', () => {
            const token = getRefreshToken()
            expect(token).toBeNull()
        })
    })

    describe('isTokenExpired', () => {
        it('should return false if token not expired', () => {
            saveToken('test-token', 3600)
            expect(isTokenExpired()).toBe(false)
        })

        it('should return true if token expired', () => {
            sessionStorage.setItem('tokenExpiry', String(Date.now() - 1000))
            expect(isTokenExpired()).toBe(true)
        })

        it('should return false if no expiry set', () => {
            expect(isTokenExpired()).toBe(false)
        })
    })

    describe('removeToken', () => {
        it('should remove all token data', () => {
            saveToken('test-token', 3600)
            saveRefreshToken('refresh-token')

            removeToken()

            expect(sessionStorage.getItem('accessToken')).toBeNull()
            expect(sessionStorage.getItem('refreshToken')).toBeNull()
            expect(sessionStorage.getItem('tokenExpiry')).toBeNull()
        })
    })

    describe('clearAuth', () => {
        it('should clear all auth data', () => {
            saveToken('test-token')
            sessionStorage.setItem('user', JSON.stringify({ id: '123' }))

            clearAuth()

            expect(sessionStorage.getItem('accessToken')).toBeNull()
            expect(sessionStorage.getItem('user')).toBeNull()
        })
    })

    describe('isAuthenticated', () => {
        it('should return true if token exists and not expired', () => {
            saveToken('test-token', 3600)
            expect(isAuthenticated()).toBe(true)
        })

        it('should return false if no token', () => {
            expect(isAuthenticated()).toBe(false)
        })

        it('should return false if token expired', () => {
            sessionStorage.setItem('accessToken', 'test-token')
            sessionStorage.setItem('tokenExpiry', String(Date.now() - 1000))
            expect(isAuthenticated()).toBe(false)
        })
    })
})
