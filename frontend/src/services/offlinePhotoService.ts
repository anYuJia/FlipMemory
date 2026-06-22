/**
 * 离线图片上传服务
 * 支持离线时将图片保存到本地，联网后自动上传
 */
import { db, generateTempId, type PendingPhoto, type UploadStatus } from '@/services/db'
import api from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import { buildStorageUrl } from '@/utils/urlBuilder'

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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

/**
 * 离线图片上传服务
 */
class OfflinePhotoService {
    private uploadPromise: Promise<{ success: number; failed: number; total: number }> | null = null
    private blobUrlRegistry = new Map<string, string>()

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

        // 文件类型校验
        if (!ALLOWED_TYPES.includes(mimeType)) {
            throw new Error(`不支持的图片格式: ${mimeType}`)
        }

        // 文件大小校验
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`图片过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        }

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

        // 创建本地预览 URL 并注册到 registry 以便后续 revoke
        const localUrl = URL.createObjectURL(file)
        this.blobUrlRegistry.set(tempId, localUrl)

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
        // 关键防护：清理文件名并强制确保带有 .jpg 后缀
        // 移除现有后缀以便重新添加
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
        const safeBaseName = nameWithoutExt.replace(/[^\w\.\-]/gi, '_') || 'photo'
        const safeFilename = `${safeBaseName}.jpg`

        // 1. 获取预签名上传 URL (使用清理并标准化后的文件名)
        const { uploadUrl, key } = await api.upload.getPresignedUrl(safeFilename, mimeType)

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
        const processed = await api.upload.confirm(key, {
            takenAt: metadata?.takenAt,
            width: metadata?.width,
            height: metadata?.height,
        })

        return {
            id: processed.originalKey,
            key: processed.originalKey,
            originalUrl: buildStorageUrl(processed.originalKey),
            thumbnailUrl: buildStorageUrl(processed.thumbnailKey),
            mediumUrl: buildStorageUrl(processed.mediumKey),
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
        if (this.uploadPromise) {
            return this.uploadPromise
        }

        const offlineStore = useOfflineStore()
        if (!offlineStore.isOnline) {
            console.log('[OfflinePhotoService] Offline, skipping upload')
            return { success: 0, failed: 0, total: 0 }
        }

        this.uploadPromise = (async () => {
            const pendingPhotos = await db.pendingPhotos
                .where('uploadStatus')
                .anyOf(['pending', 'failed'])
                .toArray()

            if (pendingPhotos.length === 0) {
                return { success: 0, failed: 0, total: 0 }
            }

            // 过滤掉还在退避期内的失败项
            const readyPhotos = pendingPhotos.filter(photo => {
                if (photo.retryCount === 0) return true
                const backoffMs = Math.min(1000 * Math.pow(2, photo.retryCount - 1), 60000)
                const lastAttempt = (photo as any).lastRetryAt || photo.createdAt
                return (Date.now() - lastAttempt) > backoffMs
            })

            if (readyPhotos.length === 0) {
                return { success: 0, failed: 0, total: 0 }
            }

            console.log(`[OfflinePhotoService] Uploading ${readyPhotos.length} pending photos...`)

            let success = 0
            let failed = 0
            const CONCURRENCY = 3

            // 分批上传，每批最多 CONCURRENCY 个
            for (let i = 0; i < readyPhotos.length; i += CONCURRENCY) {
                const batch = readyPhotos.slice(i, i + CONCURRENCY)
                const results = await Promise.allSettled(
                    batch.map(photo => this.uploadSinglePhoto(photo))
                )
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value) {
                        success++
                    } else {
                        failed++
                    }
                }
            }

            return { success, failed, total: readyPhotos.length }
        })()

        try {
            return await this.uploadPromise
        } finally {
            this.uploadPromise = null
        }
    }

    /**
     * 上传单张图片
     */
    private async uploadSinglePhoto(photo: PendingPhoto): Promise<boolean> {
        try {
            await db.pendingPhotos.update(photo.id, {
                uploadStatus: 'uploading' as UploadStatus,
            })

            const result = await this.uploadToServer(photo.blob, photo.filename, photo.mimeType, {
                takenAt: photo.takenAt,
                width: photo.width,
                height: photo.height,
            })

            // 先更新记忆中的图片引用，再删除 pending 记录
            // 如果 updateMemoryPhoto 失败，保留 pending 以避免服务器图片孤立
            try {
                await this.updateMemoryPhoto(photo.memoryDate, photo.id, result)
            } catch (e) {
                console.warn(`[OfflinePhotoService] updateMemoryPhoto failed for ${photo.id}, keeping pending record`, e)
                await db.pendingPhotos.update(photo.id, {
                    uploadStatus: 'uploaded' as UploadStatus,
                })
                return true // 上传本身成功了
            }

            await db.pendingPhotos.delete(photo.id)

            console.log(`[OfflinePhotoService] Photo uploaded: ${photo.id} -> ${result.key}`)
            return true
        } catch (error) {
            const retryCount = photo.retryCount + 1
            const errorMessage = error instanceof Error ? error.message : '上传失败'

            if (retryCount >= 5) {
                await db.pendingPhotos.delete(photo.id)
                this.revokeUrl(photo.id)
                console.error(`[OfflinePhotoService] Photo abandoned after 5 retries: ${photo.id}`)
            } else {
                await db.pendingPhotos.update(photo.id, {
                    uploadStatus: 'failed' as UploadStatus,
                    retryCount,
                    lastError: errorMessage,
                })
            }

            console.error(`[OfflinePhotoService] Photo upload failed: ${photo.id}`, error)
            return false
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

        // Revoke blob URL for the old local photo
        this.revokeUrl(tempId)

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
        // Reuse existing blob URL if available
        const existing = this.blobUrlRegistry.get(photoId)
        if (existing) return existing

        const photo = await db.pendingPhotos.get(photoId)
        if (photo) {
            const url = URL.createObjectURL(photo.blob)
            this.blobUrlRegistry.set(photoId, url)
            return url
        }
        return null
    }

    /**
     * Revoke a specific blob URL by photo ID
     */
    revokeUrl(id: string): void {
        const url = this.blobUrlRegistry.get(id)
        if (url) {
            URL.revokeObjectURL(url)
            this.blobUrlRegistry.delete(id)
        }
    }

    /**
     * Revoke all tracked blob URLs
     */
    revokeAllUrls(): void {
        for (const url of this.blobUrlRegistry.values()) {
            URL.revokeObjectURL(url)
        }
        this.blobUrlRegistry.clear()
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
