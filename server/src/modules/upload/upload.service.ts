import { env, minioClient, internalMinioClient } from '../../shared/config/index.js'
import sharp from 'sharp'
import { Readable } from 'stream'

export interface PhotoMetadata {
    takenAt?: Date
    latitude?: number
    longitude?: number
    width?: number
    height?: number
}

export interface ProcessedPhoto {
    originalKey: string
    thumbnailKey: string
    mediumKey: string
    takenAt?: Date
    latitude?: number
    longitude?: number
    width?: number
    height?: number
}

export class UploadService {
    private readonly bucket = env.minio.bucket
    private readonly thumbnailSize = 200
    private readonly mediumSize = 800

    // 生成预签名上传 URL (使用公网客户端)
    async getPresignedUploadUrl(userId: string, filename: string, _mimeType?: string): Promise<{
        uploadUrl: string
        key: string
        expiresIn: number
    }> {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '/')
        const ext = filename.split('.').pop() || 'jpg'
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2)
        const key = `uploads/${userId}/${date}/original/${uniqueId}.${ext}`

        const expiresIn = 3600 // 1 小时
        const uploadUrl = await minioClient.presignedPutObject(
            this.bucket,
            key,
            expiresIn
        )

        return {
            uploadUrl,
            key,
            expiresIn,
        }
    }

    // 生成预签名下载 URL (使用公网客户端)
    async getPresignedDownloadUrl(key: string): Promise<string> {
        const expiresIn = 3600 // 1 小时
        return await minioClient.presignedGetObject(this.bucket, key, expiresIn)
    }

    // 删除照片 (使用内部客户端，更快)
    async deletePhoto(key: string): Promise<void> {
        await internalMinioClient.removeObject(this.bucket, key)

        const thumbnailKey = key.replace('original', 'thumbnail')
        const mediumKey = key.replace('original', 'medium')

        try {
            await internalMinioClient.removeObject(this.bucket, thumbnailKey)
            await internalMinioClient.removeObject(this.bucket, mediumKey)
        } catch (err) {
            // 忽略不存在的文件错误
        }
    }

    /**
     * 下载图片流 (使用内部客户端)
     */
    private async downloadPhotoStream(key: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            internalMinioClient.getObject(this.bucket, key, (err, stream) => {
                if (err) {
                    reject(err)
                    return
                }

                stream.on('data', (chunk) => {
                    chunks.push(chunk)
                })

                stream.on('end', () => {
                    resolve(Buffer.concat(chunks))
                })

                stream.on('error', reject)
            })
        })
    }

    /**
     * 上传处理后的图片 (使用内部客户端)
     */
    private async uploadProcessedImage(
        key: string,
        buffer: Buffer,
        mimeType: string = 'image/jpeg'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const stream = Readable.from(buffer)
            internalMinioClient.putObject(
                this.bucket,
                key,
                stream,
                buffer.length,
                { 'Content-Type': mimeType },
                (err) => {
                    if (err) reject(err)
                    else resolve()
                }
            )
        })
    }

    /**
     * 上传完成后的处理（图片处理管道）
     */
    async processUploadedPhoto(key: string, metadata?: PhotoMetadata): Promise<ProcessedPhoto> {
        try {
            // 1. 下载原图 (此时原图已经在 MinIO 里了)
            const originalBuffer = await this.downloadPhotoStream(key)

            // 2. 初始化 Sharp 实例
            const pipeline = sharp(originalBuffer)
            const imageMetadata = await pipeline.metadata()
            const dimensions = {
                width: imageMetadata.width || 0,
                height: imageMetadata.height || 0,
            }

            // 3. 定义各版本的处理路径
            const thumbnailKey = key.replace('original', 'thumbnail').replace(/\.[^.]+$/, '.webp')
            const mediumKey = key.replace('original', 'medium').replace(/\.[^.]+$/, '.webp')
            const optimizedKey = key.replace(/\.[^.]+$/, '.webp')

            // 4. 并行处理和上传到 MinIO
            await Promise.all([
                // 缩略图
                pipeline.clone()
                    .resize(this.thumbnailSize, this.thumbnailSize, { fit: 'cover' })
                    .webp({ quality: 80 })
                    .toBuffer()
                    .then(buf => this.uploadProcessedImage(thumbnailKey, buf, 'image/webp')),

                // 中等尺寸
                pipeline.clone()
                    .resize(this.mediumSize, this.mediumSize, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toBuffer()
                    .then(buf => this.uploadProcessedImage(mediumKey, buf, 'image/webp')),

                // 优化后的原图
                pipeline.clone()
                    .webp({ quality: 90 })
                    .toBuffer()
                    .then(buf => this.uploadProcessedImage(optimizedKey, buf, 'image/webp'))
            ])

            // 5. 删除临时上传的原始文件（如果是不同格式）
            if (optimizedKey !== key) {
                try {
                    await internalMinioClient.removeObject(this.bucket, key)
                } catch (err) {
                    // 忽略删除错误
                }
            }

            return {
                originalKey: optimizedKey,
                thumbnailKey,
                mediumKey,
                takenAt: metadata?.takenAt,
                latitude: metadata?.latitude,
                longitude: metadata?.longitude,
                width: dimensions.width,
                height: dimensions.height,
            }
        } catch (error) {
            console.error('Error processing photo:', error)
            throw new Error(`Failed to process photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

export const uploadService = new UploadService()
