import { Client } from 'minio'
import { env } from './env.js'

/**
 * 外部客户端：使用公网 IP
 * 专门用于生成 presignedUrl，让手机和浏览器能访问
 */
export const minioClient = new Client({
    endPoint: '139.199.55.169',
    port: 9002,
    useSSL: false,
    accessKey: env.minio.accessKey,
    secretKey: env.minio.secretKey,
})

/**
 * 内部客户端：使用 Docker 内部域名
 * 专门用于后端内部处理图片（下载、上传缩略图），速度更快
 */
export const internalMinioClient = new Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: env.minio.accessKey,
    secretKey: env.minio.secretKey,
})

// 导出别名以保持向后兼容
export { internalMinioClient as publicMinioClient }

// 公开只读策略
const publicReadPolicy = (bucket: string) => JSON.stringify({
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
        },
    ],
})

export async function ensureBucket() {
    const bucket = env.minio.bucket

    const bucketExists = await internalMinioClient.bucketExists(bucket)
    if (!bucketExists) {
        await internalMinioClient.makeBucket(bucket)
        console.log(`✅ Created bucket: ${bucket}`)
    }

    // 设置 bucket 为公开只读
    try {
        await internalMinioClient.setBucketPolicy(bucket, publicReadPolicy(bucket))
        console.log(`✅ Bucket ${bucket} set to public read`)
    } catch (err) {
        console.warn(`⚠️ Failed to set bucket policy:`, err)
    }

    // 设置 CORS
    try {
        const corsConfig = {
            CORSRules: [
                {
                    AllowedOrigins: ['*'],
                    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                    AllowedHeaders: ['*'],
                    ExposeHeaders: ['ETag'],
                    MaxAgeSeconds: 3600
                }
            ]
        }
        if ((internalMinioClient as any).setBucketCors) {
            await (internalMinioClient as any).setBucketCors(bucket, corsConfig)
            console.log(`✅ Bucket ${bucket} CORS configured`)
        }
    } catch (err) {
        console.warn(`⚠️ Failed to set CORS policy:`, err)
    }
}
