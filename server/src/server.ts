import { buildApp } from './app.js'
import { env, prisma, ensureBucket } from './shared/config/index.js'
import { initRedis, getRedis } from './shared/config/redis.js'
import { initPhotoWorker, closePhotoQueue } from './modules/upload/photoQueue.js'

let app: Awaited<ReturnType<typeof buildApp>>

async function main() {
    app = await buildApp()

    try {
        // 测试数据库连接
        await prisma.$connect()
        console.log('✅ Database connected')

        // 确保 pg_trgm 扩展和搜索索引存在（加速 ILIKE '%query%'）
        try {
            await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm')
            await prisma.$executeRawUnsafe(
                'CREATE INDEX IF NOT EXISTS memories_content_trgm_idx ON memories USING GIN (content gin_trgm_ops)'
            )
            console.log('✅ pg_trgm search index ready')
        } catch (err) {
            console.warn('⚠️ pg_trgm index setup skipped (search will use seq scan):', err)
        }

        // 初始化 Redis
        try {
            initRedis()
            console.log('✅ Redis initialized')
        } catch (err) {
            console.warn('⚠️ Redis init failed (cache/verification may not work):', err)
        }

        // 初始化图片处理 worker（进程内，复用 Redis）
        try {
            initPhotoWorker()
            console.log('✅ Photo worker initialized')
        } catch (err) {
            console.warn('⚠️ Photo worker init failed (uploads will not be processed):', err)
        }

        // 确保 MinIO bucket 存在
        try {
            await ensureBucket()
        } catch (err) {
            console.warn('⚠️ MinIO bucket check failed (upload may not work):', err)
        }

        // 启动服务器
        await app.listen({ port: env.port, host: env.host })

        console.log(`
🚀 FlipMemory Server is running!
   
   Local:   http://localhost:${env.port}
   Health:  http://localhost:${env.port}/health
   
   API Endpoints:
   - POST   /api/auth/register
   - POST   /api/auth/login
   - GET    /api/auth/me
   - GET    /api/memories/calendar/:year/:month
   - GET    /api/memories/:date
   - POST   /api/memories
   - PUT    /api/memories/:date
   - DELETE /api/memories/:date
   - POST   /api/upload/presign
    `)
    } catch (err) {
        console.error('❌ Failed to start server:', err)
        process.exit(1)
    }
}

// 优雅关闭
async function shutdown() {
    console.log('\n👋 Shutting down...')
    // 兜底：超过 15 秒强制退出
    const forceExitTimer = setTimeout(() => {
        console.error('Shutdown timed out, forcing exit')
        process.exit(1)
    }, 15000)
    forceExitTimer.unref()

    try {
        // 先关闭 HTTP 服务器，停止接收新请求
        if (app) await app.close()
        // 关闭图片处理队列和 worker
        await closePhotoQueue().catch(() => {})
        const redis = getRedis()
        if (redis) await redis.quit().catch(() => {})
        await prisma.$disconnect()
    } catch (err) {
        console.error('Error during shutdown:', err)
    }
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

main()
