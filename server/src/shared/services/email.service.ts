/**
 * 邮件发送服务 (Resend)
 */

import { Resend } from 'resend'
import { env } from '../config/index.js'

let resend: Resend | null = null

function getResendClient(): Resend | null {
    if (!env.resendApiKey) {
        return null
    }
    if (!resend) {
        resend = new Resend(env.resendApiKey)
    }
    return resend
}

const FROM_ADDRESS = 'FlipMemory <no-reply@ptype.top>'

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
    to: string,
    code: string,
    purpose: 'register' | 'reset_password' | 'change_email' | 'change_password'
): Promise<boolean> {
    const client = getResendClient()
    if (!client) {
        console.error('RESEND_API_KEY is not configured, cannot send email')
        return false
    }
    const purposeText: Record<string, string> = {
        register: '注册账号',
        reset_password: '重置密码',
        change_email: '更换邮箱',
        change_password: '修改密码',
    }

    const subject = `FlipMemory 验证码 — ${purposeText[purpose] || '身份验证'}`

    try {
        const { error } = await client.emails.send({
            from: FROM_ADDRESS,
            to,
            subject,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #fafaf9; border-radius: 24px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="font-size: 20px; font-weight: 800; letter-spacing: 0.1em; color: #1a1a1a; margin: 0;">FLIPMEMORY</h1>
                        <p style="font-size: 12px; color: #999; margin-top: 4px;">记录每一个珍贵瞬间</p>
                    </div>
                    <div style="background: white; border-radius: 20px; padding: 32px; border: 1px solid #f0f0f0;">
                        <p style="font-size: 14px; color: #666; margin: 0 0 8px;">您正在进行<strong style="color: #1a1a1a;">${purposeText[purpose] || '身份验证'}</strong>操作。</p>
                        <p style="font-size: 14px; color: #666; margin: 0 0 24px;">请使用以下验证码完成验证：</p>
                        <div style="text-align: center; background: #fafaf9; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #FF8C42; font-family: 'Courier New', monospace;">${code}</span>
                        </div>
                        <p style="font-size: 12px; color: #999; margin: 0; text-align: center;">验证码 5 分钟内有效，请勿泄露给他人。</p>
                    </div>
                    <p style="font-size: 11px; color: #ccc; text-align: center; margin-top: 24px;">如果这不是您的操作，请忽略此邮件。</p>
                </div>
            `,
        })

        if (error) {
            console.error('Send email error:', error)
            return false
        }
        return true
    } catch (err) {
        console.error('Send email exception:', err)
        return false
    }
}
