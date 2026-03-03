import { FastifyInstance } from 'fastify'
import { userService } from './user.service.js'
import { updateProfileSchema, updateSettingsSchema } from './user.schema.js'
import { success, error } from '../../shared/utils/response.js'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { z } from 'zod'

export async function userRoutes(app: FastifyInstance) {
    // 所有路由都需要认证
    app.addHook('preHandler', authMiddleware)

    // 获取用户资料
    app.get('/profile', async (request, reply) => {
        try {
            const profile = await userService.getProfile(request.userId)
            return success(reply, profile)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get profile'
            return error(reply, message, 400)
        }
    })

    // 更新用户资料
    app.put('/profile', async (request, reply) => {
        try {
            const parsed = updateProfileSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const profile = await userService.updateProfile(request.userId, parsed.data)
            return success(reply, profile)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update profile'
            return error(reply, message, 400)
        }
    })

    // 获取用户设置
    app.get('/settings', async (request, reply) => {
        try {
            const settings = await userService.getSettings(request.userId)
            return success(reply, settings)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get settings'
            return error(reply, message, 400)
        }
    })

    // 更新用户设置
    app.put('/settings', async (request, reply) => {
        try {
            const parsed = updateSettingsSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const settings = await userService.updateSettings(request.userId, parsed.data)
            return success(reply, settings)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update settings'
            return error(reply, message, 400)
        }
    })

    // 验证 PIN
    app.post('/verify-pin', async (request, reply) => {
        try {
            const schema = z.object({ pin: z.string().min(4).max(6) })
            const parsed = schema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, 'Invalid PIN format', 400)
            }

            const isValid = await userService.verifyPin(request.userId, parsed.data.pin)

            if (!isValid) {
                return error(reply, 'Invalid PIN', 401)
            }

            return success(reply, { verified: true })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to verify PIN'
            return error(reply, message, 400)
        }
    })

    // 获取用户统计
    app.get('/stats', async (request, reply) => {
        try {
            const stats = await userService.getUserStats(request.userId)
            return success(reply, stats)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get stats'
            return error(reply, message, 400)
        }
    })
}
