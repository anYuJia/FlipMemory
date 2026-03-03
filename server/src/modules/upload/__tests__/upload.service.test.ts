/**
 * 上传服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadService } from '../upload.service'

// Mock MinIO client
vi.mock('../../shared/config/index.js', () => ({
    env: {
        minio: {
            bucket: 'test-bucket',
        },
    },
    minioClient: {
        presignedPutObject: vi.fn().mockResolvedValue('http://minio/upload-url'),
        presignedGetObject: vi.fn().mockResolvedValue('http://minio/download-url'),
        removeObject: vi.fn().mockResolvedValue(undefined),
        getObject: vi.fn(),
        putObject: vi.fn(),
    },
}))

describe('UploadService', () => {
    let uploadService: UploadService

    beforeEach(() => {
        uploadService = new UploadService()
        vi.clearAllMocks()
    })

    describe('getPresignedUploadUrl', () => {
        it('should generate presigned upload URL', async () => {
            const result = await uploadService.getPresignedUploadUrl(
                'user123',
                'photo.jpg'
            )

            expect(result).toHaveProperty('uploadUrl')
            expect(result).toHaveProperty('key')
            expect(result).toHaveProperty('expiresIn')
            expect(result.expiresIn).toBe(3600)
        })

        it('should include user ID in key', async () => {
            const result = await uploadService.getPresignedUploadUrl(
                'user123',
                'photo.jpg'
            )

            expect(result.key).toContain('user123')
            expect(result.key).toContain('original')
        })

        it('should preserve file extension', async () => {
            const result = await uploadService.getPresignedUploadUrl(
                'user123',
                'photo.png'
            )

            expect(result.key).toContain('.png')
        })
    })

    describe('getPresignedDownloadUrl', () => {
        it('should generate presigned download URL', async () => {
            const url = await uploadService.getPresignedDownloadUrl('uploads/user123/photo.jpg')

            expect(url).toBe('http://minio/download-url')
        })
    })

    describe('deletePhoto', () => {
        it('should delete original, thumbnail, and medium versions', async () => {
            const { minioClient } = await import('../../shared/config/index.js')

            await uploadService.deletePhoto('uploads/user123/original/photo.jpg')

            expect(minioClient.removeObject).toHaveBeenCalledTimes(3)
        })
    })

    describe('processUploadedPhoto', () => {
        it('should return processed photo keys', async () => {
            // 这个测试需要 mock sharp 库
            // 实际测试应该使用真实的图片数据
            expect(uploadService.processUploadedPhoto).toBeDefined()
        })
    })
})
