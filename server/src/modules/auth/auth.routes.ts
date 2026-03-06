import { FastifyInstance } from 'fastify'
import { authService } from './auth.service.js'
import { registerSchema, loginSchema, sendCodeSchema, forgotPasswordSchema, changePasswordSchema } from './auth.schema.js'
import { success, error } from '../../shared/utils/response.js'
import { authMiddleware } from '../../shared/middleware/auth.js'
import { createEndpointRateLimit } from '../../shared/middleware/rateLimit.js'
import { sendCode, verifyCode } from '../../shared/services/verification.service.js'

export async function authRoutes(app: FastifyInstance) {
    // ==================== 发送验证码 ====================
    app.post('/send-code', { preHandler: [createEndpointRateLimit('sendCode')] }, async (request, reply) => {
        try {
            const parsed = sendCodeSchema.safeParse(request.body)
            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const { email, purpose } = parsed.data
            const result = await sendCode(email, purpose)

            if (!result.success) {
                return error(reply, result.message, 429)
            }

            return success(reply, { message: result.message })
        } catch (err) {
            const message = err instanceof Error ? err.message : '发送验证码失败'
            return error(reply, message, 500)
        }
    })

    // ==================== 注册（需要验证码） ====================
    app.post('/register', { preHandler: [createEndpointRateLimit('register')] }, async (request, reply) => {
        try {
            const parsed = registerSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            // 验证验证码
            const codeResult = await verifyCode(parsed.data.email, 'register', parsed.data.code)
            if (!codeResult.valid) {
                return error(reply, codeResult.message, 400)
            }

            const user = await authService.register(parsed.data)
            const token = app.jwt.sign({ id: user.id })

            return success(reply, {
                user,
                accessToken: token,
            }, 201)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed'
            return error(reply, message, 400)
        }
    })

    // ==================== 登录 ====================
    app.post('/login', { preHandler: [createEndpointRateLimit('login')] }, async (request, reply) => {
        try {
            const parsed = loginSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const user = await authService.login(parsed.data)
            const token = app.jwt.sign({ id: user.id })

            return success(reply, {
                user,
                accessToken: token,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed'
            app.log.warn(`Login failed: ${message}`)
            return error(reply, message, 401)
        }
    })

    // ==================== 忘记密码（验证码 + 新密码） ====================
    app.post('/reset-password', { preHandler: [createEndpointRateLimit('resetPassword')] }, async (request, reply) => {
        try {
            const parsed = forgotPasswordSchema.safeParse(request.body)
            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            // 验证验证码
            const codeResult = await verifyCode(parsed.data.email, 'reset_password', parsed.data.code)
            if (!codeResult.valid) {
                return error(reply, codeResult.message, 400)
            }

            await authService.resetPassword(parsed.data.email, parsed.data.newPassword)

            return success(reply, { message: '密码重置成功' })
        } catch (err) {
            const message = err instanceof Error ? err.message : '重置密码失败'
            return error(reply, message, 400)
        }
    })

    // ==================== 修改密码（需要登录 + 限流） ====================
    app.post('/change-password', { preHandler: [authMiddleware, createEndpointRateLimit('changePassword')] }, async (request, reply) => {
        try {
            const parsed = changePasswordSchema.safeParse(request.body)
            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            await authService.changePassword(request.userId, parsed.data.oldPassword, parsed.data.newPassword)

            return success(reply, { message: '密码修改成功' })
        } catch (err) {
            const message = err instanceof Error ? err.message : '修改密码失败'
            return error(reply, message, 400)
        }
    })

    // ==================== 获取当前用户信息 ====================
    app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
        try {
            const user = await authService.getProfile(request.userId)
            return success(reply, user)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get profile'
            return error(reply, message, 400)
        }
    })

    // ==================== 检查用户名可用性 ====================
    app.get('/check-username', { preHandler: [createEndpointRateLimit('login')] }, async (request, reply) => {
        try {
            const { username } = request.query as { username: string }
            if (!username) {
                return error(reply, 'Username is required', 400)
            }
            const isAvailable = await authService.checkUsernameAvailability(username)
            return success(reply, { available: isAvailable })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to check username'
            return error(reply, message, 500)
        }
    })
}
