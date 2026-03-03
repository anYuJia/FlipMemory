/**
 * 加密服务测试
 */

import { describe, it, expect } from 'vitest'
import {
    hashPin,
    verifyPin,
    isWebCryptoSupported,
} from '@/services/encryptionService'

describe('encryptionService', () => {
    describe('hashPin', () => {
        it('should hash PIN consistently', async () => {
            const pin = '1234'
            const hash1 = await hashPin(pin)
            const hash2 = await hashPin(pin)
            expect(hash1).toBe(hash2)
        })

        it('should produce different hashes for different PINs', async () => {
            const hash1 = await hashPin('1234')
            const hash2 = await hashPin('5678')
            expect(hash1).not.toBe(hash2)
        })

        it('should produce hex string', async () => {
            const hash = await hashPin('1234')
            expect(hash).toMatch(/^[a-f0-9]+$/)
        })
    })

    describe('verifyPin', () => {
        it('should verify correct PIN', async () => {
            const pin = '1234'
            const hash = await hashPin(pin)
            const verified = await verifyPin(pin, hash)
            expect(verified).toBe(true)
        })

        it('should reject incorrect PIN', async () => {
            const hash = await hashPin('1234')
            const verified = await verifyPin('5678', hash)
            expect(verified).toBe(false)
        })
    })

    describe('isWebCryptoSupported', () => {
        it('should return boolean', () => {
            const supported = isWebCryptoSupported()
            expect(typeof supported).toBe('boolean')
        })

        it('should return true in modern browsers', () => {
            // 在现代浏览器中应该返回 true
            const supported = isWebCryptoSupported()
            expect(supported).toBe(true)
        })
    })
})
