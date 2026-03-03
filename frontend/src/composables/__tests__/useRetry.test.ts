/**
 * 重试机制 Composable 测试
 */

import { describe, it, expect, vi } from 'vitest'
import { retryWithBackoff } from '@/composables/useRetry'
import { AppError } from '@/utils/errorHandler'

describe('useRetry', () => {
    describe('retryWithBackoff', () => {
        it('should succeed on first attempt', async () => {
            const fn = vi.fn().mockResolvedValue('success')
            const result = await retryWithBackoff(fn)
            expect(result).toBe('success')
            expect(fn).toHaveBeenCalledTimes(1)
        })

        it('should retry on failure', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new AppError('Error', 500, null, true))
                .mockResolvedValueOnce('success')

            const result = await retryWithBackoff(fn, { maxRetries: 2 })
            expect(result).toBe('success')
            expect(fn).toHaveBeenCalledTimes(2)
        })

        it('should throw after max retries', async () => {
            const fn = vi.fn().mockRejectedValue(
                new AppError('Error', 500, null, true)
            )

            await expect(
                retryWithBackoff(fn, { maxRetries: 2 })
            ).rejects.toThrow()

            expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
        })

        it('should not retry non-retryable errors', async () => {
            const fn = vi.fn().mockRejectedValue(
                new AppError('Auth error', 401, null, false)
            )

            await expect(
                retryWithBackoff(fn, { maxRetries: 2 })
            ).rejects.toThrow()

            expect(fn).toHaveBeenCalledTimes(1) // No retries
        })

        it('should use exponential backoff', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new AppError('Error', 500, null, true))
                .mockRejectedValueOnce(new AppError('Error', 500, null, true))
                .mockResolvedValueOnce('success')

            const startTime = Date.now()
            await retryWithBackoff(fn, {
                maxRetries: 3,
                initialDelay: 10,
                backoffMultiplier: 2,
            })
            const duration = Date.now() - startTime

            // 应该至少等待 10 + 20 = 30ms
            expect(duration).toBeGreaterThanOrEqual(30)
        })

        it('should respect maxDelay', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new AppError('Error', 500, null, true))
                .mockResolvedValueOnce('success')

            await retryWithBackoff(fn, {
                maxRetries: 2,
                initialDelay: 100,
                maxDelay: 50,
                backoffMultiplier: 10,
            })

            // 第二次延迟应该被限制在 50ms
            expect(fn).toHaveBeenCalledTimes(2)
        })
    })
})
