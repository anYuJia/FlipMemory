/**
 * URL 构建工具测试
 */

import { describe, it, expect } from 'vitest'
import {
    buildApiUrl,
    buildStorageUrl,
    buildPhotoUrl,
    buildAvatarUrl,
    getThumbnailUrl,
    getMediumUrl,
    getOriginalUrl,
    buildQueryString,
    buildFullApiUrl,
} from '@/utils/urlBuilder'

describe('urlBuilder', () => {
    describe('buildApiUrl', () => {
        it('should build API URL correctly', () => {
            const url = buildApiUrl('/memories')
            expect(url).toContain('/memories')
            expect(url).toContain('api')
        })

        it('should handle leading slash', () => {
            const url1 = buildApiUrl('/memories')
            const url2 = buildApiUrl('memories')
            expect(url1).toBe(url2)
        })
    })

    describe('buildStorageUrl', () => {
        it('should build storage URL correctly', () => {
            const url = buildStorageUrl('photos/2024/01/image.jpg')
            expect(url).toContain('flipmemory')
            expect(url).toContain('photos/2024/01/image.jpg')
        })
    })

    describe('buildPhotoUrl', () => {
        it('should build thumbnail URL', () => {
            const url = buildPhotoUrl('photo.jpg', 'thumbnail')
            expect(url).toContain('size=thumbnail')
        })

        it('should build medium URL', () => {
            const url = buildPhotoUrl('photo.jpg', 'medium')
            expect(url).toContain('size=medium')
        })

        it('should build original URL', () => {
            const url = buildPhotoUrl('photo.jpg', 'original')
            expect(url).not.toContain('size=')
        })

        it('should default to original size', () => {
            const url = buildPhotoUrl('photo.jpg')
            expect(url).not.toContain('size=')
        })
    })

    describe('buildAvatarUrl', () => {
        it('should build avatar URL for valid key', () => {
            const url = buildAvatarUrl('avatars/user123.jpg')
            expect(url).toContain('avatars/user123.jpg')
        })

        it('should return null for null key', () => {
            const url = buildAvatarUrl(null)
            expect(url).toBeNull()
        })
    })

    describe('getThumbnailUrl', () => {
        it('should return thumbnail URL', () => {
            const url = getThumbnailUrl('photo.jpg')
            expect(url).toContain('size=thumbnail')
        })
    })

    describe('getMediumUrl', () => {
        it('should return medium URL', () => {
            const url = getMediumUrl('photo.jpg')
            expect(url).toContain('size=medium')
        })
    })

    describe('getOriginalUrl', () => {
        it('should return original URL', () => {
            const url = getOriginalUrl('photo.jpg')
            expect(url).not.toContain('size=')
        })
    })

    describe('buildQueryString', () => {
        it('should build query string from object', () => {
            const qs = buildQueryString({ page: 1, limit: 10 })
            expect(qs).toContain('page=1')
            expect(qs).toContain('limit=10')
            expect(qs).toContain('?')
        })

        it('should skip null and undefined values', () => {
            const qs = buildQueryString({ page: 1, limit: null, offset: undefined })
            expect(qs).toContain('page=1')
            expect(qs).not.toContain('limit')
            expect(qs).not.toContain('offset')
        })

        it('should return empty string for empty object', () => {
            const qs = buildQueryString({})
            expect(qs).toBe('')
        })
    })

    describe('buildFullApiUrl', () => {
        it('should build full API URL with query params', () => {
            const url = buildFullApiUrl('/memories', { limit: 10 })
            expect(url).toContain('/memories')
            expect(url).toContain('limit=10')
        })

        it('should build API URL without params', () => {
            const url = buildFullApiUrl('/memories')
            expect(url).toContain('/memories')
            expect(url).not.toContain('?')
        })
    })
})
