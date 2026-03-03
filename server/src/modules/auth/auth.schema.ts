import { z } from 'zod'
import { ValidationRules } from '../../shared/utils/validation.js'

export const registerSchema = z.object({
    email: ValidationRules.email,
    username: ValidationRules.username,
    password: ValidationRules.password,
    nickname: ValidationRules.nickname.optional(),
})

export const loginSchema = z.object({
    account: z.string().min(1, '请输入邮箱或用户名').max(255),
    password: z.string().min(1, '请输入密码').max(100),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
