import { FastifyInstance } from 'fastify'
import { authService } from './auth.service.js'
import { registerSchema, loginSchema } from './auth.schema.js'
import { success, error } from '../../shared/utils/response.js'
import { authMiddleware } from '../../shared/middleware/auth.js'

export async function authRoutes(app: FastifyInstance) {
    // 注册
    app.post('/register', async (request, reply) => {
        try {
            const parsed = registerSchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
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

    // 登录
    app.post('/login', async (request, reply) => {
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
            app.log.warn(`Login failed: ${message} for account: ${(request.body as any)?.account}`)
            return error(reply, message, 401)
        }
    })

    // 获取当前用户信息
    app.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
        try {
            const user = await authService.getProfile(request.userId)
            return success(reply, user)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get profile'
            return error(reply, message, 400)
        }
    })

    // 检查用户名可用性
    app.get('/check-username', async (request, reply) => {
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
