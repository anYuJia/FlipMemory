/**
 * 离线图片上传服务
 * 支持离线时将图片保存到本地，联网后自动上传
 */
import { db, generateTempId, type PendingPhoto, type UploadStatus } from '@/services/db'
import api from '@/services/api'
import { useOfflineStore } from '@/stores/offline'

/**
 * 图片上传结果
 */
export interface PhotoUploadResult {
    id: string
    key: string
    originalUrl: string
    thumbnailUrl: string
    mediumUrl: string
    isLocal: boolean  // 是否为本地临时图片
}

/**
 * 离线图片上传服务
 */
class OfflinePhotoService {
    private isUploading = false

    /**
     * 保存图片（离线优先）
     * 如果在线则直接上传，否则保存到本地等待后续上传
     */
    async savePhoto(
        memoryDate: string,
        file: File | Blob,
        metadata?: {
            filename?: string
            takenAt?: string | null
            width?: number | null
            height?: number | null
            order?: number
        }
    ): Promise<PhotoUploadResult> {
        const offlineStore = useOfflineStore()
        const tempId = generateTempId()
        const filename = metadata?.filename || (file instanceof File ? file.name : `photo_${Date.now()}.jpg`)
        const mimeType = file.type || 'image/jpeg'

        // 如果在线且未开启离线模式，尝试直接上传
        if (offlineStore.isOnline && !offlineStore.offlineModeEnabled) {
            try {
                const result = await this.uploadToServer(file, filename, mimeType, metadata)
                return {
                    ...result,
                    isLocal: false,
                }
            } catch (error) {
                console.warn('[OfflinePhotoService] Upload failed, saving locally:', error)
                // 上传失败，保存到本地
            }
        }

        // 保存到本地 IndexedDB
        const pendingPhoto: PendingPhoto = {
            id: tempId,
            memoryDate,
            blob: file,
            filename,
            mimeType,
            width: metadata?.width || null,
            height: metadata?.height || null,
            takenAt: metadata?.takenAt || null,
            order: metadata?.order || 0,
            uploadStatus: 'pending',
            createdAt: Date.now(),
            retryCount: 0,
        }

        await db.pendingPhotos.add(pendingPhoto)

        // 创建本地预览 URL
        const localUrl = URL.createObjectURL(file)

        console.log('[OfflinePhotoService] Photo saved locally:', tempId)

        return {
            id: tempId,
            key: tempId,
            originalUrl: localUrl,
            thumbnailUrl: localUrl,
            mediumUrl: localUrl,
            isLocal: true,
        }
    }

    /**
     * 上传图片到服务器
     */
    private async uploadToServer(
        file: File | Blob,
        filename: string,
        mimeType: string,
        metadata?: {
            takenAt?: string | null
            width?: number | null
            height?: number | null
        }
    ): Promise<PhotoUploadResult> {
        // 1. 获取预签名上传 URL
        const { uploadUrl, key } = await api.upload.getPresignedUrl(filename, mimeType)

        // 2. 上传到存储服务
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': mimeType,
            },
        })

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`)
        }

        // 3. 确认上传完成
        const { photo } = await api.upload.confirm(key, {
            takenAt: metadata?.takenAt,
            width: metadata?.width,
            height: metadata?.height,
        })

        return {
            id: photo.id,
            key,
            originalUrl: photo.originalUrl,
            thumbnailUrl: photo.thumbnailUrl,
            mediumUrl: photo.mediumUrl,
            isLocal: false,
        }
    }

    /**
     * 上传所有待处理的图片
     */
    async uploadPendingPhotos(): Promise<{
        success: number
        failed: number
        total: number
    }> {
        if (this.isUploading) {
            console.log('[OfflinePhotoService] Already uploading...')
            return { success: 0, failed: 0, total: 0 }
        }

        const offlineStore = useOfflineStore()
        if (!offlineStore.isOnline) {
            console.log('[OfflinePhotoService] Offline, skipping upload')
            return { success: 0, failed: 0, total: 0 }
        }

        this.isUploading = true

        try {
            const pendingPhotos = await db.pendingPhotos
                .where('uploadStatus')
                .anyOf(['pending', 'failed'])
                .toArray()

            if (pendingPhotos.length === 0) {
                return { success: 0, failed: 0, total: 0 }
            }

            console.log(`[OfflinePhotoService] Uploading ${pendingPhotos.length} pending photos...`)

            let success = 0
            let failed = 0

            for (const photo of pendingPhotos) {
                try {
                    // 更新状态为上传中
                    await db.pendingPhotos.update(photo.id, {
                        uploadStatus: 'uploading' as UploadStatus,
                    })

                    // 上传到服务器
                    const result = await this.uploadToServer(photo.blob, photo.filename, photo.mimeType, {
                        takenAt: photo.takenAt,
                        width: photo.width,
                        height: photo.height,
                    })

                    // 更新关联的记忆中的图片信息
                    await this.updateMemoryPhoto(photo.memoryDate, photo.id, result)

                    // 删除待上传记录
                    await db.pendingPhotos.delete(photo.id)
                    success++

                    console.log(`[OfflinePhotoService] Photo uploaded: ${photo.id} -> ${result.key}`)
                } catch (error) {
                    failed++
                    const retryCount = photo.retryCount + 1
                    const errorMessage = error instanceof Error ? error.message : '上传失败'

                    // 更新重试计数和状态
                    await db.pendingPhotos.update(photo.id, {
                        uploadStatus: 'failed' as UploadStatus,
                        retryCount,
                        lastError: errorMessage,
                    })

                    console.error(`[OfflinePhotoService] Photo upload failed: ${photo.id}`, error)
                }
            }

            return { success, failed, total: pendingPhotos.length }
        } finally {
            this.isUploading = false
        }
    }

    /**
     * 更新记忆中的图片信息（将临时图片替换为服务器图片）
     */
    private async updateMemoryPhoto(
        memoryDate: string,
        tempId: string,
        serverPhoto: PhotoUploadResult
    ): Promise<void> {
        const memory = await db.memories.get(memoryDate)
        if (!memory) return

        // 找到并更新对应的临时图片
        const updatedPhotos = memory.photos.map(p => {
            if (p.id === tempId) {
                return {
                    ...p,
                    id: serverPhoto.id,
                    key: serverPhoto.key,
                    originalUrl: serverPhoto.originalUrl,
                    thumbnailUrl: serverPhoto.thumbnailUrl,
                    mediumUrl: serverPhoto.mediumUrl,
                    _localBlob: undefined,
                    _uploadStatus: 'uploaded' as UploadStatus,
                }
            }
            return p
        })

        await db.memories.update(memoryDate, {
            photos: updatedPhotos,
        })
    }

    /**
     * 获取待上传图片数量
     */
    async getPendingCount(): Promise<number> {
        return await db.pendingPhotos
            .where('uploadStatus')
            .anyOf(['pending', 'failed'])
            .count()
    }

    /**
     * 获取指定记忆的待上传图片
     */
    async getPendingPhotosForMemory(memoryDate: string): Promise<PendingPhoto[]> {
        return await db.pendingPhotos
            .where('memoryDate')
            .equals(memoryDate)
            .toArray()
    }

    /**
     * 删除待上传的图片
     */
    async deletePendingPhoto(photoId: string): Promise<void> {
        await db.pendingPhotos.delete(photoId)
    }

    /**
     * 获取本地图片的 Blob URL
     */
    async getLocalPhotoUrl(photoId: string): Promise<string | null> {
        const photo = await db.pendingPhotos.get(photoId)
        if (photo) {
            return URL.createObjectURL(photo.blob)
        }
        return null
    }

    /**
     * 清理所有待上传的图片
     */
    async clearPendingPhotos(): Promise<void> {
        await db.pendingPhotos.clear()
    }
}

// 导出单例
export const offlinePhotoService = new OfflinePhotoService()
export default offlinePhotoService
