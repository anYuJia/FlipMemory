import { Client } from 'minio'
import { env } from './env.js'

export const minioClient = new Client({
    endPoint: env.minio.endpoint,
    port: env.minio.port,
    useSSL: env.minio.useSSL,
    accessKey: env.minio.accessKey,
    secretKey: env.minio.secretKey,
})

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

    const bucketExists = await minioClient.bucketExists(bucket)
    if (!bucketExists) {
        await minioClient.makeBucket(bucket)
        console.log(`✅ Created bucket: ${bucket}`)
    }

    // 设置 bucket 为公开只读
    try {
        await minioClient.setBucketPolicy(bucket, publicReadPolicy(bucket))
        console.log(`✅ Bucket ${bucket} set to public read`)
    } catch (err) {
        console.warn(`⚠️ Failed to set bucket policy:`, err)
    }
}

