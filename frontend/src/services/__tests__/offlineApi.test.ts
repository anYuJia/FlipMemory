/**
 * 离线 API 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { offlineApi } from '@/services/offlineApi'

// Mock Pinia store
vi.mock('@/stores/offline', () => ({
    useOfflineStore: () => ({
        isOnline: true,
        offlineModeEnabled: false,
        getLocalMemory: vi.fn(),
        saveLocalMemory: vi.fn(),
        getLocalCalendarDays: vi.fn(),
        saveLocalCalendarDays: vi.fn(),
        updateLocalCalendarDay: vi.fn(),
        deleteLocalMemory: vi.fn(),
        bulkSaveMemories: vi.fn(),
    }),
}))

// Mock API
vi.mock('@/services/api', () => ({
    default: {
        memories: {
            getCalendar: vi.fn(),
            getByDate: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getFlashback: vi.fn(),
            getStats: vi.fn(),
            search: vi.fn(),
            getRecent: vi.fn(),
        },
    },
}))

describe('offlineApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('memories', () => {
        it('should have getCalendar method', () => {
            expect(offlineApi.memories.getCalendar).toBeDefined()
        })

        it('should have getByDate method', () => {
            expect(offlineApi.memories.getByDate).toBeDefined()
        })

        it('should have create method', () => {
            expect(offlineApi.memories.create).toBeDefined()
        })

        it('should have update method', () => {
            expect(offlineApi.memories.update).toBeDefined()
        })

        it('should have delete method', () => {
            expect(offlineApi.memories.delete).toBeDefined()
        })

        it('should have getRecent method', () => {
            expect(offlineApi.memories.getRecent).toBeDefined()
        })

        it('should have search method', () => {
            expect(offlineApi.memories.search).toBeDefined()
        })

        it('should have getFlashback method', () => {
            expect(offlineApi.memories.getFlashback).toBeDefined()
        })

        it('should have getStats method', () => {
            expect(offlineApi.memories.getStats).toBeDefined()
        })
    })
})
