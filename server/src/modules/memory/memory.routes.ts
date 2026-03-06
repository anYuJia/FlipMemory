import { FastifyInstance } from 'fastify'
import { memoryService } from './memory.service.js'
import {
    createMemorySchema,
    updateMemorySchema,
    calendarQuerySchema
} from './memory.schema.js'
import { success, error, notFound } from '../../shared/utils/response.js'
import { authMiddleware } from '../../shared/middleware/auth.js'

export async function memoryRoutes(app: FastifyInstance) {
    // 所有路由都需要认证
    app.addHook('preHandler', authMiddleware)

    // 获取月度日历数据
    app.get('/calendar/:year/:month', async (request, reply) => {
        try {
            const parsed = calendarQuerySchema.safeParse(request.params)

            if (!parsed.success) {
                return error(reply, 'Invalid year or month', 400)
            }

            const data = await memoryService.getCalendarData(
                request.userId,
                parsed.data.year,
                parsed.data.month
            )

            return success(reply, {
                year: parsed.data.year,
                month: parsed.data.month,
                days: data,
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get calendar data'
            return error(reply, message, 500)
        }
    })

    // 具名路由必须在通配 /:date 之前注册，否则会被拦截

    // 获取回顾记忆
    app.get('/flashback', async (request, reply) => {
        try {
            const data = await memoryService.getFlashbackMemories(request.userId)
            return success(reply, data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get flashback'
            return error(reply, message, 500)
        }
    })

    // 获取统计数据
    app.get('/stats', async (request, reply) => {
        try {
            const { range, year, month, week } = request.query as {
                range?: string
                year?: string
                month?: string
                week?: string
            }

            const data = await memoryService.getStats(
                request.userId,
                range,
                year ? parseInt(year) : undefined,
                month ? parseInt(month) : undefined,
                week ? parseInt(week) : undefined
            )
            return success(reply, data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get stats'
            return error(reply, message, 500)
        }
    })

    // 搜索记忆
    app.get('/search', async (request, reply) => {
        try {
            const { q, mood, from, to, limit, skip } = request.query as {
                q?: string
                mood?: string
                from?: string
                to?: string
                limit?: string
                skip?: string
            }

            const data = await memoryService.searchMemories(
                request.userId,
                q,
                mood,
                from,
                to,
                limit ? parseInt(limit) : 20,
                skip ? parseInt(skip) : 0
            )
            return success(reply, data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to search memories'
            return error(reply, message, 500)
        }
    })

    // 获取最近记忆
    app.get('/recent', async (request, reply) => {
        try {
            const { limit, skip } = request.query as { limit?: string; skip?: string }
            const data = await memoryService.getRecentMemories(
                request.userId,
                limit ? parseInt(limit) : 10,
                skip ? parseInt(skip) : 0
            )
            return success(reply, data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get recent memories'
            return error(reply, message, 500)
        }
    })

    // 获取纪念日记忆
    app.get('/anniversary', async (request, reply) => {
        try {
            const data = await memoryService.getAnniversaryMemories(request.userId)
            return success(reply, data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get anniversary memories'
            return error(reply, message, 500)
        }
    })

    // 通配路由放在最后，避免拦截具名路由
    // 获取指定日期的记忆
    app.get('/:date', async (request, reply) => {
        try {
            const { date } = request.params as { date: string }
            const memory = await memoryService.getMemoryByDate(request.userId, date)

            if (!memory) {
                return notFound(reply, 'Memory not found')
            }

            return success(reply, memory)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get memory'
            return error(reply, message, 500)
        }
    })

    // 创建记忆
    app.post('/', async (request, reply) => {
        try {
            const parsed = createMemorySchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const memory = await memoryService.createMemory(request.userId, parsed.data)
            return success(reply, memory, 201)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create memory'
            return error(reply, message, 400)
        }
    })

    // 更新记忆
    app.put('/:date', async (request, reply) => {
        try {
            const { date } = request.params as { date: string }
            const parsed = updateMemorySchema.safeParse(request.body)

            if (!parsed.success) {
                return error(reply, parsed.error.errors[0].message, 400)
            }

            const memory = await memoryService.updateMemory(request.userId, date, parsed.data)
            return success(reply, memory)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update memory'
            return error(reply, message, 400)
        }
    })

    // 删除记忆
    app.delete('/:date', async (request, reply) => {
        try {
            const { date } = request.params as { date: string }
            await memoryService.deleteMemory(request.userId, date)
            return success(reply, { deleted: true })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete memory'
            return error(reply, message, 400)
        }
    })
}
