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
    apiResponseTime?: number
    renderTime?: number
    memoryUsage?: number
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {}
    private marks: Map<string, number> = new Map()

    /**
     * 初始化性能监控
     */
    init() {
        this.measureWebVitals()
        this.measurePageLoadTime()
        this.monitorMemory()
    }

    /**
     * 测量 Web Vitals
     */
    private measureWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const lastEntry = entries[entries.length - 1]
                    this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime
                    logger.debug(`LCP: ${this.metrics.lcp}ms`, 'PerformanceMonitor')
                })
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
            } catch (err) {
                logger.warn('LCP monitoring not supported', 'PerformanceMonitor')
            }

            // Cumulative Layout Shift (CLS)
            try {
                let clsValue = 0
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!(entry as any).hadRecentInput) {
                            clsValue += (entry as any).value
                        }
                    }
                    this.metrics.cls = clsValue
                    logger.debug(`CLS: ${this.metrics.cls}`, 'PerformanceMonitor')
                })
                clsObserver.observe({ entryTypes: ['layout-shift'] })
            } catch (err) {
                logger.warn('CLS monitoring not supported', 'PerformanceMonitor')
            }

            // First Input Delay (FID)
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const firstEntry = entries[0]
                    this.metrics.fid = (firstEntry as any).processingDuration
                    logger.debug(`FID: ${this.metrics.fid}ms`, 'PerformanceMonitor')
                })
                fidObserver.observe({ entryTypes: ['first-input'] })
            } catch (err) {
                logger.warn('FID monitoring not supported', 'PerformanceMonitor')
            }
        }
    }

    /**
     * 测量页面加载时间
     */
    private measurePageLoadTime() {
        if ('PerformanceNavigationTiming' in window) {
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
                if (perfData) {
                    this.metrics.ttfb = perfData.responseStart - perfData.fetchStart
                    this.metrics.fcp = perfData.responseEnd - perfData.fetchStart
                    this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart
                    this.metrics.loadComplete = perfData.loadEventEnd - perfData.fetchStart

                    logger.info('Page load metrics', 'PerformanceMonitor', this.metrics)
                }
            })
        }
    }

    /**
     * 监控内存使用
     */
    private monitorMemory() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = (performance as any).memory
                this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB

                if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                    logger.warn('High memory usage detected', 'PerformanceMonitor', {
                        used: this.metrics.memoryUsage,
                        limit: Math.round(memory.jsHeapSizeLimit / 1048576),
                    })
                }
            }, 30000) // 每 30 秒检查一次
        }
    }

    /**
     * 标记性能时间点
     */
    mark(name: string) {
        this.marks.set(name, performance.now())
    }

    /**
     * 测量两个标记之间的时间
     */
    measure(name: string, startMark: string, endMark?: string): number {
        const startTime = this.marks.get(startMark)
        if (!startTime) {
            logger.warn(`Start mark not found: ${startMark}`, 'PerformanceMonitor')
            return 0
        }

        const endTime = endMark ? this.marks.get(endMark) : performance.now()
        if (endMark && !endTime) {
            logger.warn(`End mark not found: ${endMark}`, 'PerformanceMonitor')
            return 0
        }

        const duration = (endTime || performance.now()) - startTime
        logger.debug(`${name}: ${duration.toFixed(2)}ms`, 'PerformanceMonitor')

        return duration
    }

    /**
     * 记录 API 响应时间
     */
    recordApiCall(endpoint: string, duration: number) {
        logger.debug(`API call: ${endpoint} - ${duration.toFixed(2)}ms`, 'PerformanceMonitor')

        if (duration > 3000) {
            logger.warn(`Slow API call: ${endpoint} - ${duration.toFixed(2)}ms`, 'PerformanceMonitor')
        }
    }

    /**
     * 获取所有指标
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics }
    }

    /**
     * 生成性能报告
     */
    generateReport(): string {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            userAgent: navigator.userAgent,
            url: window.location.href,
        }

        return JSON.stringify(report, null, 2)
    }

    /**
     * 上报性能指标到服务器
     */
    async reportMetrics(endpoint: string): Promise<void> {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: this.generateReport(),
            })

            if (response.ok) {
                logger.info('Performance metrics reported successfully', 'PerformanceMonitor')
            } else {
                logger.warn('Failed to report performance metrics', 'PerformanceMonitor', {
                    status: response.status,
                })
            }
        } catch (error) {
            logger.error('Error reporting performance metrics', 'PerformanceMonitor', error)
        }
    }
}

export const performanceMonitor = new PerformanceMonitor()
