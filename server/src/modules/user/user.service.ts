import { prisma } from '../../shared/config/index.js'
import { getFileUrl } from '../../shared/utils/file.js'
import type { UpdateProfileInput, UpdateSettingsInput } from './user.schema.js'
import bcrypt from 'bcryptjs'

interface MoodStat {
    mood: string | null
    _count: { mood: number }
}

export const userService = {
    /**
     * 获取用户资料
     */
    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                gender: true,
                birthday: true,
                profession: true,
                interests: true,
                timezone: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!user) {
            throw new Error('User not found')
        }

        return {
            ...user,
            avatarUrl: getFileUrl(user.avatar),
            birthday: user.birthday?.toISOString().split('T')[0] || null,
        }
    },

    /**
     * 更新用户资料
     */
    async updateProfile(userId: string, input: UpdateProfileInput) {
        const updateData: Record<string, any> = {}

        if (input.nickname !== undefined) updateData.nickname = input.nickname
        if (input.gender !== undefined) updateData.gender = input.gender
        if (input.profession !== undefined) updateData.profession = input.profession
        if (input.interests !== undefined) updateData.interests = input.interests
        if (input.avatar !== undefined) updateData.avatar = input.avatar
        if (input.birthday !== undefined) {
            updateData.birthday = input.birthday ? new Date(input.birthday) : null
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                gender: true,
                birthday: true,
                profession: true,
                interests: true,
                timezone: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return {
            ...user,
            avatarUrl: getFileUrl(user.avatar),
            birthday: user.birthday?.toISOString().split('T')[0] || null,
        }
    },

    /**
     * 获取用户设置
     */
    async getSettings(userId: string) {
        let settings = await prisma.userSettings.findUnique({
            where: { userId },
        })

        // 如果没有设置记录，创建默认设置
        if (!settings) {
            settings = await prisma.userSettings.create({
                data: { userId },
            })
        }

        // 不返回 PIN
        const { appLockPin, ...safeSettings } = settings
        return {
            ...safeSettings,
            hasPin: !!appLockPin,
        }
    },

    /**
     * 更新用户设置
     */
    async updateSettings(userId: string, input: UpdateSettingsInput) {
        const updateData: Record<string, any> = {}

        if (input.reminderEnabled !== undefined) updateData.reminderEnabled = input.reminderEnabled
        if (input.reminderTime !== undefined) updateData.reminderTime = input.reminderTime
        if (input.reminderFrequency !== undefined) updateData.reminderFrequency = input.reminderFrequency
        if (input.appLockEnabled !== undefined) updateData.appLockEnabled = input.appLockEnabled
        if (input.appLockType !== undefined) updateData.appLockType = input.appLockType
        if (input.theme !== undefined) updateData.theme = input.theme
        if (input.startOfWeek !== undefined) updateData.startOfWeek = input.startOfWeek

        // 如果提供了 PIN，进行加密
        if (input.appLockPin !== undefined) {
            if (input.appLockPin) {
                updateData.appLockPin = await bcrypt.hash(input.appLockPin, 10)
            } else {
                updateData.appLockPin = null
            }
        }

        const settings = await prisma.userSettings.upsert({
            where: { userId },
            create: { userId, ...updateData },
            update: updateData,
        })

        // 不返回 PIN
        const { appLockPin, ...safeSettings } = settings
        return {
            ...safeSettings,
            hasPin: !!appLockPin,
        }
    },

    /**
     * 验证 PIN
     */
    async verifyPin(userId: string, pin: string): Promise<boolean> {
        const settings = await prisma.userSettings.findUnique({
            where: { userId },
            select: { appLockPin: true },
        })

        if (!settings?.appLockPin) {
            return false
        }

        return bcrypt.compare(pin, settings.appLockPin)
    },

    /**
     * 获取用户统计信息
     */
    async getUserStats(userId: string) {
        const [totalMemories, totalPhotos, moodStats] = await Promise.all([
            prisma.memory.count({ where: { userId } }),
            prisma.photo.count({
                where: {
                    memory: { userId },
                },
            }),
            prisma.memory.groupBy({
                by: ['mood'],
                where: { userId, mood: { not: null } },
                _count: { mood: true },
            }),
        ])

        return {
            totalMemories,
            totalPhotos,
            moodStats: moodStats.map(s => ({
                mood: s.mood,
                count: s._count.mood,
            })),
        }
    },
}
