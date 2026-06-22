import { z } from 'zod'
import { ValidationRules } from '../../shared/utils/validation.js'

export const registerSchema = z.object({
    email: ValidationRules.email,
    username: ValidationRules.username,
    password: ValidationRules.password,
    nickname: ValidationRules.nickname.optional(),
    code: z.string().length(6, '验证码必须是 6 位'),
})

export const loginSchema = z.object({
    account: z.string().min(1, '请输入邮箱或用户名').max(255),
    password: z.string().min(1, '请输入密码').max(100),
})

export const sendCodeSchema = z.object({
    email: ValidationRules.email,
    purpose: z.enum(['register', 'reset_password', 'change_email', 'change_password']),
})

export const forgotPasswordSchema = z.object({
    email: ValidationRules.email,
    code: z.string().length(6, '验证码必须是 6 位'),
    newPassword: ValidationRules.password,
})

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, '请输入旧密码').max(100).optional(),
    code: z.string().length(6, '验证码必须是 6 位').optional(),
    newPassword: ValidationRules.password,
}).refine(data => data.oldPassword || data.code, {
    message: '请提供旧密码或验证码',
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SendCodeInput = z.infer<typeof sendCodeSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
