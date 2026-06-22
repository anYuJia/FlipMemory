/**
 * 图片处理队列（BullMQ）
 * 把 sharp 图片处理从 HTTP 请求链路移到后台 worker，
 * /upload/complete 入队后立即返回可预测的 keys。
 */
import { Queue, Worker } from 'bullmq'
import { env } from '../../shared/config/index.js'
import { uploadService } from './upload.service.js'

interface PhotoJobData {
    key: string
    metadata?: {
        takenAt?: Date
        latitude?: number
        longitude?: number
        width?: number
        height?: number
    }
}

// BullMQ 要求 maxRetriesPerRequest: null（使用阻塞命令）
const connection = {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    db: env.redis.db,
    maxRetriesPerRequest: null as null,
}

const photoQueue = new Queue<PhotoJobData>('photo-processing', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
})

let worker: Worker<PhotoJobData> | null = null

/**
 * 初始化图片处理 worker（进程内，concurrency=3）
 */
export function initPhotoWorker() {
    if (worker) return worker

    worker = new Worker<PhotoJobData>(
        'photo-processing',
        async (job) => {
            const { key, metadata } = job.data
            console.log(`[PhotoQueue] Processing job ${job.id}: ${key}`)
            await uploadService.processUploadedPhoto(key, metadata)
            console.log(`[PhotoQueue] Job ${job.id} completed: ${key}`)
        },
        { connection, concurrency: 3 },
    )

    worker.on('failed', (job, err) => {
        console.error(`[PhotoQueue] Job ${job?.id} failed:`, err.message)
    })

    return worker
}

/**
 * 关闭队列和 worker（优雅关闭）
 */
export async function closePhotoQueue() {
    if (worker) {
        await worker.close()
        worker = null
    }
    await photoQueue.close()
}

/**
 * 入队一个图片处理任务
 */
export async function enqueuePhotoProcessing(
    key: string,
    metadata?: PhotoJobData['metadata'],
) {
    await photoQueue.add('process', { key, metadata })
}
