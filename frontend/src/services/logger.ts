/**
 * 前端日志系统
 * 使用 localStorage 存储日志，支持上报到服务器
 */

export const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
} as const

export type LogLevel = typeof LogLevel[keyof typeof LogLevel]

export interface LogEntry {
    timestamp: number
    level: LogLevel
    message: string
    context?: string
    data?: any
    stackTrace?: string
}

class Logger {
    private logs: LogEntry[] = []
    private maxLogs = 1000
    private minLevel: LogLevel = LogLevel.DEBUG
    private saveTimeout: ReturnType<typeof setTimeout> | null = null
    private readonly SAVE_DEBOUNCE_MS = 1000

    /**
     * 记录日志
     */
    private log(level: LogLevel, message: string, context?: string, data?: any, stackTrace?: string) {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            context,
            data,
            stackTrace,
        }

        this.logs.push(entry)

        // 保持日志数量在限制内
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs)
        }

        // 同时输出到控制台
        this.logToConsole(entry)

        // 批量保存到 localStorage（防抖）
        this.scheduleSave()
    }

    /**
     * 调度保存（防抖）
     */
    private scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout)
        }
        this.saveTimeout = setTimeout(() => {
            this.saveToLocalStorage()
            this.saveTimeout = null
        }, this.SAVE_DEBOUNCE_MS)
    }

    /**
     * 输出到控制台
     */
    private logToConsole(entry: LogEntry) {
        const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.level}]${entry.context ? ` [${entry.context}]` : ''}`

        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(prefix, entry.message, entry.data)
                break
            case LogLevel.INFO:
                console.info(prefix, entry.message, entry.data)
                break
            case LogLevel.WARN:
                console.warn(prefix, entry.message, entry.data)
                break
            case LogLevel.ERROR:
                console.error(prefix, entry.message, entry.data, entry.stackTrace)
                break
        }
    }

    /**
     * 保存到 localStorage
     */
    private saveToLocalStorage() {
        try {
            localStorage.setItem('app_logs', JSON.stringify(this.logs))
        } catch (err) {
            // localStorage 满了，清除旧日志
            if (err instanceof Error && err.name === 'QuotaExceededError') {
                this.logs = this.logs.slice(-100)
                try {
                    localStorage.setItem('app_logs', JSON.stringify(this.logs))
                } catch {
                    // 忽略错误
                }
            }
        }
    }

    /**
     * 调试日志
     */
    debug(message: string, context?: string, data?: any) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.log(LogLevel.DEBUG, message, context, data)
        }
    }

    /**
     * 信息日志
     */
    info(message: string, context?: string, data?: any) {
        if (this.shouldLog(LogLevel.INFO)) {
            this.log(LogLevel.INFO, message, context, data)
        }
    }

    /**
     * 警告日志
     */
    warn(message: string, context?: string, data?: any) {
        if (this.shouldLog(LogLevel.WARN)) {
            this.log(LogLevel.WARN, message, context, data)
        }
    }

    /**
     * 错误日志
     */
    error(message: string, context?: string, error?: any) {
        if (this.shouldLog(LogLevel.ERROR)) {
            const stackTrace = error instanceof Error ? error.stack : undefined
            this.log(LogLevel.ERROR, message, context, error, stackTrace)
        }
    }

    /**
     * 检查是否应该记录
     */
    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
        const minIndex = levels.indexOf(this.minLevel)
        const currentIndex = levels.indexOf(level)
        return currentIndex >= minIndex
    }

    /**
     * 设置最小日志级别
     */
    setMinLevel(level: LogLevel) {
        this.minLevel = level
    }

    /**
     * 获取所有日志
     */
    getLogs(): LogEntry[] {
        return [...this.logs]
    }

    /**
     * 获取指定级别的日志
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logs.filter(log => log.level === level)
    }

    /**
     * 获取指定上下文的日志
     */
    getLogsByContext(context: string): LogEntry[] {
        return this.logs.filter(log => log.context === context)
    }

    /**
     * 清除日志
     */
    clear() {
        this.logs = []
        localStorage.removeItem('app_logs')
    }

    /**
     * 导出日志
     */
    export(): string {
        return JSON.stringify(this.logs, null, 2)
    }

    /**
     * 上报日志到服务器
     */
    async reportToServer(endpoint: string): Promise<void> {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logs: this.logs,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now(),
                }),
            })

            if (response.ok) {
                this.info('Logs reported to server successfully', 'Logger')
            } else {
                this.warn('Failed to report logs to server', 'Logger', { status: response.status })
            }
        } catch (error) {
            this.error('Error reporting logs to server', 'Logger', error)
        }
    }
}

export const logger = new Logger()
