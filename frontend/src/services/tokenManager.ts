/**
 * Token 管理服务
 * 使用 HttpOnly Cookie 存储 token（如果可能）
 * 否则使用 sessionStorage（比 localStorage 更安全）
 */

const TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const TOKEN_EXPIRY_KEY = 'tokenExpiry'

/**
 * 获取存储方式 - 强制统一使用 localStorage 以确保多处读写一致性
 */
function getStorage(): Storage {
    return localStorage
}

/**
 * 保存 token
 */
export function saveToken(token: string, expiresIn?: number): void {
    const storage = getStorage()
    storage.setItem(TOKEN_KEY, token)

    // 保存过期时间
    if (expiresIn) {
        const expiry = Date.now() + expiresIn * 1000
        storage.setItem(TOKEN_EXPIRY_KEY, String(expiry))
    }
}

/**
 * 获取 token
 */
export function getToken(): string | null {
    const storage = getStorage()
    const token = storage.getItem(TOKEN_KEY)

    // 检查 token 是否过期
    if (token && isTokenExpired()) {
        removeToken()
        return null
    }

    return token
}

/**
 * 保存刷新 token
 */
export function saveRefreshToken(token: string): void {
    const storage = getStorage()
    storage.setItem(REFRESH_TOKEN_KEY, token)
}

/**
 * 获取刷新 token
 */
export function getRefreshToken(): string | null {
    const storage = getStorage()
    return storage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * 检查 token 是否过期
 */
export function isTokenExpired(): boolean {
    const storage = getStorage()
    const expiry = storage.getItem(TOKEN_EXPIRY_KEY)

    // 如果没有过期时间记录，但 Token 存在，则认为没有过期（由服务端 401 保证安全）
    if (!expiry) {
        return false
    }

    return Date.now() > parseInt(expiry)
}

/**
 * 移除 token
 */
export function removeToken(): void {
    const storage = getStorage()
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(REFRESH_TOKEN_KEY)
    storage.removeItem(TOKEN_EXPIRY_KEY)
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
    removeToken()
    const storage = getStorage()
    storage.removeItem('user')
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
    return getToken() !== null && !isTokenExpired()
}
