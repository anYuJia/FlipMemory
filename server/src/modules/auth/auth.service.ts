import bcrypt from 'bcryptjs'
import { prisma } from '../../shared/config/index.js'
import { getFileUrl } from '../../shared/utils/file.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

export class AuthService {
    async register(input: RegisterInput) {
        const { email, username, password, nickname } = input

        // 检查邮箱或用户名是否已存在
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            },
        })

        if (existingUser) {
            if (existingUser.email === email) {
                throw new Error('Email already registered')
            }
            if (existingUser.username === username) {
                throw new Error('Username already taken')
            }
        }

        // 加密密码
        const passwordHash = await bcrypt.hash(password, 10)

        // 创建用户
        const user = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                nickname,
                settings: {
                    create: {},  // 创建默认设置
                },
            },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                timezone: true,
                createdAt: true,
            },
        })
        return {
            ...user,
            avatarUrl: getFileUrl(user.avatar),
        }
    }

    async login(input: LoginInput) {
        const { account, password } = input

        // 查找用户 (支持邮箱或用户名)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: account },
                    { username: account }
                ]
            },
        })

        if (!user) {
            throw new Error('Invalid account or password')
        }

        // 验证密码
        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
            throw new Error('Invalid account or password')
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            avatarUrl: getFileUrl(user.avatar),
            timezone: user.timezone,
            createdAt: user.createdAt,
        }
    }

    async checkUsernameAvailability(username: string) {
        const user = await prisma.user.findUnique({
            where: { username },
        })
        return !user
    }

    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nickname: true,
                avatar: true,
                timezone: true,
                createdAt: true,
                settings: true,
            },
        })

        if (!user) {
            throw new Error('User not found')
        }
        return {
            ...user,
            avatarUrl: getFileUrl(user.avatar),
        }
    }

    /**
     * 重置密码（通过邮箱验证码）
     */
    async resetPassword(email: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            throw new Error('该邮箱未注册')
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        })
    }

    /**
     * 修改密码（已登录用户，需验证旧密码）
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            throw new Error('User not found')
        }

        const isValid = await bcrypt.compare(oldPassword, user.passwordHash)
        if (!isValid) {
            throw new Error('旧密码不正确')
        }

        const passwordHash = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        })
    }
}

export const authService = new AuthService()
