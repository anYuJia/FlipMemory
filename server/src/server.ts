import { buildApp } from './app.js'
import { env, prisma, ensureBucket } from './shared/config/index.js'

async function main() {
    const app = await buildApp()

    try {
        // 测试数据库连接
        await prisma.$connect()
        console.log('✅ Database connected')

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
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...')
    await prisma.$disconnect()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n👋 Shutting down...')
    await prisma.$disconnect()
    process.exit(0)
})

main()
