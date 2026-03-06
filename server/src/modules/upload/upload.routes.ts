import { FastifyInstance } from 'fastify'
import { uploadService } from './upload.service.js'
import { success, error } from '../../shared/utils/response.js'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { UploadPresignSchema, UploadCompleteSchema, formatValidationError } from '../../shared/utils/validation.js'

export async function uploadRoutes(app: FastifyInstance) {
    // 所有路由都需要认证
    app.addHook('preHandler', authMiddleware)

    // 获取预签名上传 URL
    app.post('/presign', async (request, reply) => {
        try {
            const parsed = UploadPresignSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, formatValidationError(parsed.error), 400)
            }

            const result = await uploadService.getPresignedUploadUrl(
                request.userId,
                parsed.data.filename,
                parsed.data.mimeType
            )

            app.log.info(`Generated presigned URL for user ${request.userId}, key: ${result.key}`)

            return success(reply, result)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get upload URL'
            return error(reply, message, 500)
        }
    })

    // 上传完成确认
    app.post('/complete', async (request, reply) => {
        try {
            const parsed = UploadCompleteSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, formatValidationError(parsed.error), 400)
            }

            const { key, takenAt, latitude, longitude, width, height } = parsed.data

            const result = await uploadService.processUploadedPhoto(key, {
                takenAt: takenAt ? new Date(takenAt) : undefined,
                latitude: latitude ?? undefined,
                longitude: longitude ?? undefined,
                width: width ?? undefined,
                height: height ?? undefined,
            })
            return success(reply, result)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to process upload'
            return error(reply, message, 500)
        }
    })
}
