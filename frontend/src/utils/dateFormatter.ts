/**
 * 统一的日期格式化工具
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateToString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid Date'
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为相对时间（如 "2小时前"）
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid Date'
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
    return `${Math.floor(diffDays / 365)}年前`
}

/**
 * 格式化日期为 MM-DD（用于日历显示）
 */
export function formatMonthDay(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid Date'
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day}`
}

/**
 * 格式化日期为中文格式（如 "2024年2月9日"）
 */
export function formatChineseDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Invalid Date'
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${year}年${month}月${day}日`
}

/**
 * 解析 YYYY-MM-DD 格式的日期字符串
 */
export function parseDate(dateStr: string): Date {
    const [year = 1970, month = 1, day = 1] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayString(): string {
    return formatDateToString(new Date())
}

/**
 * 获取昨天的日期字符串 (YYYY-MM-DD)
 */
export function getYesterdayString(): string {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDateToString(yesterday)
}

/**
 * 获取一年前的日期字符串 (YYYY-MM-DD)
 */
export function getYearAgoString(): string {
    const yearAgo = new Date()
    const originalMonth = yearAgo.getMonth()
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    // Handle leap year edge case (e.g., Feb 29 → Mar 1)
    if (yearAgo.getMonth() !== originalMonth) {
        yearAgo.setDate(0) // Go to last day of previous month (Feb 28)
    }
    return formatDateToString(yearAgo)
}
