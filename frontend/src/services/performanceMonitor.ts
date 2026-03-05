/**
 * 性能监控服务
 * 监控 Web Vitals 和关键性能指标
 */

import { logger } from './logger'

export interface PerformanceMetrics {
    // Core Web Vitals
    lcp?: number // Largest Contentful Paint
    fid?: number // First Input Delay
    cls?: number // Cumulative Layout Shift

    // 其他指标
    fcp?: number // First Contentful Paint
    ttfb?: number // Time to First Byte
    domContentLoaded?: number
    loadComplete?: number

    // 自定义指标
    apiAvg?: number
    health?: number
    memoryUsage?: number
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {}
    private marks: Map<string, number> = new Map()
    private apiDurations: number[] = []
    private errorCount: number = 0
    private errorHandler = () => { this.errorCount++ }
    private rejectionHandler = () => { this.errorCount++ }
    private memoryIntervalId: ReturnType<typeof setInterval> | null = null

    /**
     * 初始化性能监控
     */
    init() {
        if (typeof window === 'undefined') return
        this.measureWebVitals()
        this.measurePageLoadTime()
        this.monitorMemory()

        // 监听全局错误以计算健康度
        window.addEventListener('error', this.errorHandler)
        window.addEventListener('unhandledrejection', this.rejectionHandler)
    }

    /**
     * 销毁性能监控，清理所有事件监听和定时器
     */
    destroy() {
        if (typeof window === 'undefined') return
        window.removeEventListener('error', this.errorHandler)
        window.removeEventListener('unhandledrejection', this.rejectionHandler)
        if (this.memoryIntervalId !== null) {
            clearInterval(this.memoryIntervalId)
            this.memoryIntervalId = null
        }
    }

    /**
     * 测量 Web Vitals
     */
    private measureWebVitals() {
        if (!('PerformanceObserver' in window)) return

        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                const lastEntry = entries[entries.length - 1]
                this.metrics.lcp = (lastEntry as any).renderTime || (lastEntry as any).loadTime
            })
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                const firstEntry = entries[0]
                this.metrics.fid = (firstEntry as any).processingDuration
            })
            fidObserver.observe({ type: 'first-input', buffered: true })
        } catch (err) {
            logger.debug('Vitals monitoring limited', 'PerformanceMonitor')
        }
    }

    private measurePageLoadTime() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
                if (perfData) {
                    this.metrics.ttfb = perfData.responseStart - perfData.fetchStart
                    this.metrics.fcp = perfData.responseEnd - perfData.fetchStart
                    this.metrics.loadComplete = perfData.loadEventEnd - perfData.fetchStart
                }
            }, 0)
        })
    }

    private monitorMemory() {
        if ('memory' in performance) {
            this.memoryIntervalId = setInterval(() => {
                const memory = (performance as any).memory
                this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576)
            }, 10000)
        }
    }

    /**
     * 记录 API 响应时间
     */
    recordApiCall(endpoint: string, duration: number) {
        this.apiDurations.push(duration)
        if (this.apiDurations.length > 50) this.apiDurations.shift() // 保持最近 50 次
        
        if (duration > 3000) {
            logger.warn(`Slow API call: ${endpoint} - ${duration.toFixed(2)}ms`, 'PerformanceMonitor')
        }
    }

    /**
     * 获取当前性能摘要 (Task 1)
     */
    getSummary(): PerformanceMetrics {
        const avgApi = this.apiDurations.length > 0 
            ? this.apiDurations.reduce((a, b) => a + b, 0) / this.apiDurations.length 
            : 0

        return {
            ...this.metrics,
            apiAvg: avgApi,
            health: Math.max(0, 100 - (this.errorCount * 5))
        }
    }

    /**
     * 标记与测量 (用于特定逻辑耗时分析)
     */
    mark(name: string) { this.marks.set(name, performance.now()) }
    measure(name: string, startMark: string): number {
        const start = this.marks.get(startMark)
        if (!start) return 0
        const duration = performance.now() - start
        logger.debug(`${name}: ${duration.toFixed(2)}ms`, 'PerformanceMonitor')
        return duration
    }
}

export const performanceMonitor = new PerformanceMonitor()
