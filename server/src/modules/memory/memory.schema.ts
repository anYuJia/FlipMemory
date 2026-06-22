import { z } from 'zod'

export const moodTypes = [
    'happy', 'sad', 'angry', 'calm',
    'excited', 'tired', 'loved', 'thinking'
] as const

// 照片上传数据（包含 EXIF 信息）
export const photoDataSchema = z.object({
    key: z.string(),
    takenAt: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
})

export const createMemorySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    content: z.string().optional(),
    mood: z.enum(moodTypes).optional(),
    isPrivate: z.boolean().optional().default(false),
    weather: z.string().optional(),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    // 支持两种格式：简单的 key 数组或完整的照片数据
    photoKeys: z.array(z.string()).optional(),
    photos: z.array(photoDataSchema).optional(),
    tags: z.array(z.string()).optional(),
})

export const updateMemorySchema = z.object({
    content: z.string().optional(),
    mood: z.enum(moodTypes).optional().nullable(),
    isPrivate: z.boolean().optional(),
    weather: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // 支持添加新照片
    photoKeys: z.array(z.string()).optional(),
    photos: z.array(photoDataSchema).optional(),
    // 支持删除现有照片
    removePhotoIds: z.array(z.string()).optional(),
})

export const calendarQuerySchema = z.object({
    year: z.coerce.number().min(2000).max(2100),
    month: z.coerce.number().min(1).max(12),
})

export type CreateMemoryInput = z.infer<typeof createMemorySchema>
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>
