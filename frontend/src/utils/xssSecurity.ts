/**
 * XSS 防护工具
 * 清理和转义用户输入，防止 XSS 攻击
 */

/**
 * HTML 实体映射
 */
const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
}

/**
 * 转义 HTML 特殊字符
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return str
    return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
}

/**
 * 反转义 HTML 实体
 */
export function unescapeHtml(str: string): string {
    if (typeof str !== 'string') return str
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#x60;/g, '`')
        .replace(/&#x3D;/g, '=')
}

/**
 * 移除 HTML 标签
 */
export function stripHtml(str: string): string {
    if (typeof str !== 'string') return str
    return str.replace(/<[^>]*>/g, '')
}

/**
 * 清理危险的 HTML 属性
 */
export function sanitizeAttributes(str: string): string {
    if (typeof str !== 'string') return str
    return str
        // 移除事件处理器
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
        // 移除 javascript: 协议
        .replace(/javascript:/gi, '')
        // 移除 data: 协议（除了图片）
        .replace(/data:(?!image\/)/gi, '')
        // 移除 vbscript: 协议
        .replace(/vbscript:/gi, '')
}

/**
 * 清理 URL
 */
export function sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return ''

    const trimmed = url.trim().toLowerCase()

    // 检查危险协议
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:']
    for (const protocol of dangerousProtocols) {
        if (trimmed.startsWith(protocol)) {
            return ''
        }
    }

    // 允许的协议
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
    const hasProtocol = allowedProtocols.some(p => trimmed.startsWith(p))

    // 如果没有协议，检查是否是相对路径
    if (!hasProtocol && !trimmed.startsWith('/') && !trimmed.startsWith('#')) {
        // 添加 https:// 前缀
        return `https://${url}`
    }

    return url
}

/**
 * 允许的 HTML 标签
 */
const allowedTags = new Set([
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'code', 'pre',
])

/**
 * 清理 HTML（保留安全的标签和属性）
 */
export function sanitizeHtml(html: string): string {
    if (typeof html !== 'string') return ''

    // 简单的 HTML 清理实现
    // 生产环境建议使用 DOMPurify 库

    let result = html

    // 移除脚本标签
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // 移除样式标签
    result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    // 移除注释
    result = result.replace(/<!--[\s\S]*?-->/g, '')

    // 清理属性
    result = sanitizeAttributes(result)

    // 移除不允许的标签（保留内容）
    result = result.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
        const tagLower = tag.toLowerCase()
        if (allowedTags.has(tagLower)) {
            return match
        }
        return ''
    })

    return result
}

/**
 * 清理用户输入（用于显示）
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return ''
    return escapeHtml(stripHtml(input))
}

/**
 * 清理对象中的所有字符串
 */
export function sanitizeObject<T>(obj: T): T {
    if (typeof obj === 'string') {
        return sanitizeInput(obj) as T
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject) as T
    }

    if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeObject(value)
        }
        return result as T
    }

    return obj
}

/**
 * 创建安全的 innerHTML
 */
export function createSafeHtml(html: string): string {
    return sanitizeHtml(html)
}

/**
 * 检查字符串是否包含潜在的 XSS
 */
export function containsXss(str: string): boolean {
    if (typeof str !== 'string') return false

    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /<form/i,
        /expression\s*\(/i,
        /url\s*\(/i,
    ]

    return xssPatterns.some(pattern => pattern.test(str))
}

/**
 * 安全地设置文本内容
 */
export function setTextContent(element: HTMLElement, text: string): void {
    element.textContent = text
}

/**
 * 安全地设置 HTML 内容
 */
export function setInnerHtml(element: HTMLElement, html: string): void {
    element.innerHTML = sanitizeHtml(html)
}

/**
 * 清理纯文本（移除 HTML 标签，保留文本）
 */
export function sanitizeText(text: string): string {
    if (typeof text !== 'string') return ''
    return stripHtml(text).trim()
}

/**
 * 清理用于存储的文本（转义特殊字符）
 */
export function sanitizeForStorage(text: string): string {
    if (typeof text !== 'string') return ''
    // 移除 HTML 标签，但保留原始文本
    return stripHtml(text).trim()
}
