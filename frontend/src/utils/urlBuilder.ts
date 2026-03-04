/**
 * 统一的 URL 构建工具
 */

/**
 * 获取 API 基准地址
 * 优先从 localStorage 读取，实现移动端动态配置，
 * 否则从环境变量读取，最后回退到默认地址。
 */
export function getApiBaseUrl(): string {
    const savedUrl = localStorage.getItem('apiUrl')
    if (savedUrl) return savedUrl
    
    // 智能默认逻辑：移动端环境下，如果没配置，优先尝试生产服务器
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile) {
        return 'http://139.199.55.169:3001/api'
    }
    
    return import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
}

/**
 * 获取存储基准地址
 */
export function getStorageBaseUrl(): string {
    const savedUrl = localStorage.getItem('storageUrl')
    if (savedUrl) return savedUrl
    return import.meta.env.VITE_STORAGE_URL || 'http://localhost:9000'
}

/**
 * 构建 API 端点 URL
 */
export function buildApiUrl(endpoint: string): string {
    const baseUrl = getApiBaseUrl()
    // 移除开头的斜杠
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    // 确保 baseUrl 结尾没有斜杠
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${normalizedBase}/${cleanEndpoint}`
}

/**
 * 构建存储 URL（用于图片）
 */
export function buildStorageUrl(key: string): string {
    const baseUrl = getStorageBaseUrl()
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${normalizedBase}/flipmemory/${key}`
}

/**
 * 构建图片 URL（支持多种尺寸）
 */
export function buildPhotoUrl(
    key: string,
    size: 'thumbnail' | 'medium' | 'original' = 'original'
): string {
    const baseUrl = buildStorageUrl(key)

    // 根据尺寸添加后缀
    switch (size) {
        case 'thumbnail':
            return `${baseUrl}?size=thumbnail`
        case 'medium':
            return `${baseUrl}?size=medium`
        case 'original':
        default:
            return baseUrl
    }
}

/**
 * 构建头像 URL
 */
export function buildAvatarUrl(key: string | null): string | null {
    if (!key) return null
    return buildStorageUrl(key)
}

/**
 * 获取图片的缩略图 URL
 */
export function getThumbnailUrl(photoKey: string): string {
    return buildPhotoUrl(photoKey, 'thumbnail')
}

/**
 * 获取图片的中等尺寸 URL
 */
export function getMediumUrl(photoKey: string): string {
    return buildPhotoUrl(photoKey, 'medium')
}

/**
 * 获取图片的原始 URL
 */
export function getOriginalUrl(photoKey: string): string {
    return buildPhotoUrl(photoKey, 'original')
}

/**
 * 构建查询参数
 */
export function buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.append(key, String(value))
        }
    }

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
}

/**
 * 构建完整的 API URL（包含查询参数）
 */
export function buildFullApiUrl(
    endpoint: string,
    params?: Record<string, any>
): string {
    const baseUrl = buildApiUrl(endpoint)
    const queryString = params ? buildQueryString(params) : ''
    return `${baseUrl}${queryString}`
}
