/**
 * SQL 安全工具
 * 防止 SQL 注入和提供安全的查询构建
 */

import { Prisma } from '@prisma/client'

/**
 * 转义 SQL 特殊字符
 */
export function escapeSqlString(value: string): string {
    return value
        .replace(/'/g, "''")
        .replace(/\\/g, '\\\\')
        .replace(/\x00/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z')
}

/**
 * 验证标识符（表名、列名）
 */
export function isValidIdentifier(identifier: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)
}

/**
 * 安全的标识符
 */
export function safeIdentifier(identifier: string): string {
    if (!isValidIdentifier(identifier)) {
        throw new Error(`Invalid identifier: ${identifier}`)
    }
    return `"${identifier}"`
}

/**
 * 安全的 LIKE 查询
 */
export function safeLikePattern(pattern: string): string {
    return pattern
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
}

/**
 * 构建安全的 WHERE 条件
 */
export function buildWhereClause(conditions: Record<string, any>): {
    sql: string
    params: any[]
} {
    const clauses: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(conditions)) {
        if (value === undefined || value === null) continue

        if (!isValidIdentifier(key)) {
            throw new Error(`Invalid column name: ${key}`)
        }

        if (Array.isArray(value)) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ')
            clauses.push(`"${key}" IN (${placeholders})`)
            params.push(...value)
        } else if (typeof value === 'object' && value !== null) {
            // 处理范围查询
            if ('gte' in value) {
                clauses.push(`"${key}" >= $${paramIndex++}`)
                params.push(value.gte)
            }
            if ('lte' in value) {
                clauses.push(`"${key}" <= $${paramIndex++}`)
                params.push(value.lte)
            }
            if ('gt' in value) {
                clauses.push(`"${key}" > $${paramIndex++}`)
                params.push(value.gt)
            }
            if ('lt' in value) {
                clauses.push(`"${key}" < $${paramIndex++}`)
                params.push(value.lt)
            }
            if ('contains' in value) {
                clauses.push(`"${key}" ILIKE $${paramIndex++}`)
                params.push(`%${safeLikePattern(value.contains)}%`)
            }
        } else {
            clauses.push(`"${key}" = $${paramIndex++}`)
            params.push(value)
        }
    }

    return {
        sql: clauses.length > 0 ? clauses.join(' AND ') : '1=1',
        params,
    }
}

/**
 * 构建安全的 ORDER BY 子句
 */
export function buildOrderByClause(
    orderBy: Record<string, 'asc' | 'desc'>,
    allowedColumns: string[]
): string {
    const clauses: string[] = []

    for (const [column, direction] of Object.entries(orderBy)) {
        if (!allowedColumns.includes(column)) {
            throw new Error(`Invalid order by column: ${column}`)
        }
        if (direction !== 'asc' && direction !== 'desc') {
            throw new Error(`Invalid order direction: ${direction}`)
        }
        clauses.push(`"${column}" ${direction.toUpperCase()}`)
    }

    return clauses.length > 0 ? clauses.join(', ') : '"createdAt" DESC'
}

/**
 * 构建安全的分页子句
 */
export function buildPaginationClause(page: number, limit: number): {
    sql: string
    offset: number
    limit: number
} {
    const safeLimit = Math.min(Math.max(1, limit), 100)
    const safePage = Math.max(1, page)
    const offset = (safePage - 1) * safeLimit

    return {
        sql: `LIMIT ${safeLimit} OFFSET ${offset}`,
        offset,
        limit: safeLimit,
    }
}

/**
 * 安全的原始 SQL 查询构建器
 */
export class SafeQueryBuilder {
    private selectClause: string = '*'
    private fromClause: string = ''
    private whereClause: string = '1=1'
    private orderByClause: string = ''
    private limitClause: string = ''
    private params: any[] = []
    private paramIndex: number = 1

    select(columns: string[]): this {
        const safeColumns = columns.map(col => {
            if (!isValidIdentifier(col)) {
                throw new Error(`Invalid column: ${col}`)
            }
            return `"${col}"`
        })
        this.selectClause = safeColumns.join(', ')
        return this
    }

    from(table: string): this {
        if (!isValidIdentifier(table)) {
            throw new Error(`Invalid table: ${table}`)
        }
        this.fromClause = `"${table}"`
        return this
    }

    where(conditions: Record<string, any>): this {
        const { sql, params } = buildWhereClause(conditions)
        this.whereClause = sql
        this.params = params
        this.paramIndex = params.length + 1
        return this
    }

    andWhere(column: string, value: any): this {
        if (!isValidIdentifier(column)) {
            throw new Error(`Invalid column: ${column}`)
        }
        this.whereClause += ` AND "${column}" = $${this.paramIndex++}`
        this.params.push(value)
        return this
    }

    orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
        if (!isValidIdentifier(column)) {
            throw new Error(`Invalid column: ${column}`)
        }
        this.orderByClause = `ORDER BY "${column}" ${direction.toUpperCase()}`
        return this
    }

    limit(limit: number, offset: number = 0): this {
        const safeLimit = Math.min(Math.max(1, limit), 100)
        const safeOffset = Math.max(0, offset)
        this.limitClause = `LIMIT ${safeLimit} OFFSET ${safeOffset}`
        return this
    }

    build(): { sql: string; params: any[] } {
        const parts = [
            `SELECT ${this.selectClause}`,
            `FROM ${this.fromClause}`,
            `WHERE ${this.whereClause}`,
        ]

        if (this.orderByClause) {
            parts.push(this.orderByClause)
        }

        if (this.limitClause) {
            parts.push(this.limitClause)
        }

        return {
            sql: parts.join(' '),
            params: this.params,
        }
    }
}

/**
 * 创建安全查询构建器
 */
export function createSafeQuery(): SafeQueryBuilder {
    return new SafeQueryBuilder()
}

/**
 * 使用 Prisma 的安全原始查询
 */
export function prismaRaw(
    strings: TemplateStringsArray,
    ...values: any[]
): Prisma.Sql {
    return Prisma.sql(strings, ...values)
}
