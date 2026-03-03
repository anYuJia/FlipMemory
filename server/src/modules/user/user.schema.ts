import { z } from 'zod'

// 更新用户资料
export const updateProfileSchema = z.object({
    nickname: z.string().min(1).max(50).optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').nullable().optional(),
    profession: z.string().max(50).nullable().optional(),
    interests: z.array(z.string().max(20)).max(10).optional(),
    avatar: z.string().nullable().optional(),
})

// 更新用户设置
export const updateSettingsSchema = z.object({
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/, '时间格式应为 HH:mm').optional(),
    reminderFrequency: z.enum(['daily', 'weekly']).optional(),
    appLockEnabled: z.boolean().optional(),
    appLockType: z.enum(['pin', 'biometric']).nullable().optional(),
    appLockPin: z.string().min(4).max(6).nullable().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    startOfWeek: z.union([z.literal(0), z.literal(1)]).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
