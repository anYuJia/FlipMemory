import { env } from '../config/index.js'

/**
 * 获取图片完整 URL
 */
export function getFileUrl(key: string | null): string | null {
    if (!key) return null
    if (key.startsWith('http')) return key

    return `http://${env.minio.endpoint}:${env.minio.port}/${env.minio.bucket}/${key}`
}
