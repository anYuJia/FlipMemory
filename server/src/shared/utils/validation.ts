/**
 * 增强的输入验证
 */

import { z } from 'zod'

/**
 * 通用验证规则
 */
export const ValidationRules = {
    // 字符串长度限制
    shortString: z.string().min(1).max(100),
    mediumString: z.string().min(1).max(500),
    longString: z.string().min(1).max(5000),
    content: z.string().max(10000),

    // 日期格式
    dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),

    // 邮箱
    email: z.string().email('邮箱格式不正确').max(255),

    // 密码
    password: z.string()
        .min(8, '密码至少 8 个字符')
        .max(100, '密码最多 100 个字符')
        .regex(/[a-z]/, '密码必须包含小写字母')
        .regex(/[A-Z]/, '密码必须包含大写字母')
        .regex(/[0-9]/, '密码必须包含数字'),

    // 用户名
    username: z.string()
        .min(3, '用户名至少 3 个字符')
        .max(30, '用户名最多 30 个字符')
        .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),

    // 昵称
    nickname: z.string().min(1).max(50),

    // 情绪类型
    mood: z.enum(['happy', 'sad', 'angry', 'calm', 'excited', 'tired', 'loved', 'thinking']),

    // 分页参数
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20),

    // 年月
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),

    // 文件相关
    filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_\-\.]+$/, '文件名包含非法字符'),
    mimeType: z.string().regex(/^(image|video|audio)\/(jpeg|png|gif|webp|mp4|mp3|wav)$/, '不支持的文件类型'),

    // 坐标
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),

    // PIN 码
    pin: z.string().regex(/^\d{4,6}$/, 'PIN 码必须是 4-6 位数字'),

    // 标签
    tag: z.string().min(1).max(30),
    tags: z.array(z.string().min(1).max(30)).max(10),

    // 照片键
    photoKey: z.string().min(1).max(500),
    photoKeys: z.array(z.string().min(1).max(500)).max(20),
}

/**
 * 创建记忆验证 Schema
 */
export const CreateMemorySchema = z.object({
    date: ValidationRules.dateString,
    content: ValidationRules.content.optional(),
    mood: ValidationRules.mood.optional(),
    photoKeys: ValidationRules.photoKeys.optional(),
    tags: ValidationRules.tags.optional(),
    weather: ValidationRules.shortString.optional(),
    location: ValidationRules.mediumString.optional(),
    latitude: ValidationRules.latitude.optional(),
    longitude: ValidationRules.longitude.optional(),
})

/**
 * 更新记忆验证 Schema
 */
export const UpdateMemorySchema = z.object({
    content: ValidationRules.content.optional(),
    mood: ValidationRules.mood.optional(),
    isPrivate: z.boolean().optional(),
    tags: ValidationRules.tags.optional(),
})

/**
 * 搜索记忆验证 Schema
 */
export const SearchMemorySchema = z.object({
    q: ValidationRules.mediumString.optional(),
    mood: ValidationRules.mood.optional(),
    from: ValidationRules.dateString.optional(),
    to: ValidationRules.dateString.optional(),
    limit: ValidationRules.limit.optional(),
})

/**
 * 注册验证 Schema
 */
export const RegisterSchema = z.object({
    email: ValidationRules.email,
    username: ValidationRules.username,
    password: ValidationRules.password,
    nickname: ValidationRules.nickname.optional(),
})

/**
 * 登录验证 Schema
 */
export const LoginSchema = z.object({
    account: z.string().min(1).max(255),
    password: z.string().min(1).max(100),
})

/**
 * 更新用户资料验证 Schema
 */
export const UpdateProfileSchema = z.object({
    nickname: ValidationRules.nickname.optional(),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    birthday: ValidationRules.dateString.nullable().optional(),
    profession: ValidationRules.shortString.nullable().optional(),
    interests: z.array(ValidationRules.shortString).max(20).optional(),
    avatar: z.string().max(500).nullable().optional(),
})

/**
 * 更新用户设置验证 Schema
 */
export const UpdateSettingsSchema = z.object({
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reminderFrequency: z.enum(['daily', 'weekly']).optional(),
    appLockEnabled: z.boolean().optional(),
    appLockType: z.enum(['pin', 'biometric']).nullable().optional(),
    appLockPin: ValidationRules.pin.nullable().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    startOfWeek: z.union([z.literal(0), z.literal(1)]).optional(),
})

/**
 * 上传验证 Schema
 */
export const UploadPresignSchema = z.object({
    filename: ValidationRules.filename,
    mimeType: ValidationRules.mimeType.optional(),
})

/**
 * 上传完成验证 Schema
 */
export const UploadCompleteSchema = z.object({
    key: ValidationRules.photoKey,
    takenAt: z.string().datetime().nullable().optional(),
    latitude: ValidationRules.latitude.nullable().optional(),
    longitude: ValidationRules.longitude.nullable().optional(),
    width: z.number().int().min(1).max(10000).nullable().optional(),
    height: z.number().int().min(1).max(10000).nullable().optional(),
})

/**
 * 验证函数
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data)
}

/**
 * 安全验证函数（返回结果而不是抛出异常）
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean
    data?: T
    error?: z.ZodError
} {
    const result = schema.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}

/**
 * 格式化验证错误
 */
export function formatValidationError(error: z.ZodError): string {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}
