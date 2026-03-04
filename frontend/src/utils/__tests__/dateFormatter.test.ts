/**
 * 日期格式化工具测试
 */

import { describe, it, expect } from 'vitest'
import {
    formatDateToString,
    formatDateTime,
    formatMonthDay,
    formatChineseDate,
    parseDate,
    getTodayString,
    getYesterdayString,
    getYearAgoString,
} from '@/utils/dateFormatter'

describe('dateFormatter', () => {
    describe('formatDateToString', () => {
        it('should format date to YYYY-MM-DD', () => {
            const date = new Date('2024-02-09')
            expect(formatDateToString(date)).toBe('2024-02-09')
        })

        it('should pad month and day with zeros', () => {
            const date = new Date('2024-01-05')
            expect(formatDateToString(date)).toBe('2024-01-05')
        })
    })

    describe('formatDateTime', () => {
        it('should format date to YYYY-MM-DD HH:mm:ss', () => {
            const date = new Date('2024-02-09T14:30:45')
            const result = formatDateTime(date)
            expect(result).toMatch(/2024-02-09 \d{2}:\d{2}:\d{2}/)
        })

        it('should accept string input', () => {
            const result = formatDateTime('2024-02-09T14:30:45')
            expect(result).toMatch(/2024-02-09 \d{2}:\d{2}:\d{2}/)
        })
    })

    describe('formatMonthDay', () => {
        it('should format date to MM-DD', () => {
            const date = new Date('2024-02-09')
            expect(formatMonthDay(date)).toBe('02-09')
        })
    })

    describe('formatChineseDate', () => {
        it('should format date to Chinese format', () => {
            const date = new Date('2024-02-09')
            expect(formatChineseDate(date)).toBe('2024年2月9日')
        })
    })

    describe('parseDate', () => {
        it('should parse YYYY-MM-DD string to Date', () => {
            const date = parseDate('2024-02-09')
            expect(date.getFullYear()).toBe(2024)
            expect(date.getMonth()).toBe(1) // 0-indexed
            expect(date.getDate()).toBe(9)
        })
    })

    describe('getTodayString', () => {
        it('should return today date in YYYY-MM-DD format', () => {
            const today = getTodayString()
            expect(today).toMatch(/\d{4}-\d{2}-\d{2}/)
        })
    })

    describe('getYesterdayString', () => {
        it('should return yesterday date in YYYY-MM-DD format', () => {
            const yesterday = getYesterdayString()
            expect(yesterday).toMatch(/\d{4}-\d{2}-\d{2}/)
        })
    })

    describe('getYearAgoString', () => {
        it('should return one year ago date in YYYY-MM-DD format', () => {
            const yearAgo = getYearAgoString()
            expect(yearAgo).toMatch(/\d{4}-\d{2}-\d{2}/)
        })
    })
})
