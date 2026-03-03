/**
 * 统一的 URL 构建工具
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:9000'

/**
 * 构建 API 端点 URL
 */
export function buildApiUrl(endpoint: string): string {
    // 移除开头的斜杠
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    return `${API_BASE_URL}/${cleanEndpoint}`
}

/**
 * 构建存储 URL（用于图片）
 */
export function buildStorageUrl(key: string): string {
    return `${STORAGE_BASE_URL}/flipmemory/${key}`
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
