// 统一导出所有类型

export * from './memory'
export * from './user'

// API 响应类型
export interface ApiResponse<T = unknown> {
    code: number
    message?: string
    data: T
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
}
