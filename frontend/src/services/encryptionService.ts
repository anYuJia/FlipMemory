/**
 * 数据加密服务
 * 使用 Web Crypto API 进行端到端加密
 */

// 派生密钥缓存：同密码+salt 复用，避免每次加解密都跑 100K PBKDF2 迭代
let _keyCache: { password: string; salt: Uint8Array; key: CryptoKey } | null = null

function saltsEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
    return true
}

/**
 * 生成加密密钥（带缓存）
 * @param password 用户密码
 * @param salt 可选的 salt，如果不提供则生成新的（加密时）或复用缓存的
 * @returns 密钥和使用的 salt
 */
export async function generateEncryptionKey(
    password: string,
    salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    // 缓存命中检查
    if (_keyCache) {
        if (salt) {
            // 解密：同密码 + 同 salt → 复用
            if (_keyCache.password === password && saltsEqual(_keyCache.salt, salt)) {
                return { key: _keyCache.key, salt }
            }
        } else {
            // 加密：同密码 → 复用缓存的 salt 和 key（避免重复 PBKDF2）
            if (_keyCache.password === password) {
                return { key: _keyCache.key, salt: _keyCache.salt }
            }
        }
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(password)

    // 如果没有提供 salt，生成随机 salt
    const usedSalt = salt || window.crypto.getRandomValues(new Uint8Array(16))

    // 使用 PBKDF2 派生密钥
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    )

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: usedSalt as BufferSource,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )

    // 写入缓存
    _keyCache = { password, salt: usedSalt, key }

    return { key, salt: usedSalt }
}

/**
 * 清除密钥缓存（密码变更 / 登出时调用）
 */
export function clearKeyCache() {
    _keyCache = null
}

/**
 * 加密文本
 * 返回格式: base64(salt + iv + encrypted)
 */
export async function encryptText(text: string, password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)

    // 生成密钥和 salt
    const { key, salt } = await generateEncryptionKey(password)

    // 生成随机 IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // 加密
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    )

    // 组合 salt + IV + 加密数据
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    // 转换为 Base64（分块处理避免栈溢出）
    const chunks: string[] = []
    for (let i = 0; i < combined.length; i += 8192) {
        const sub = combined.subarray(i, i + 8192)
        let s = ''
        for (let j = 0; j < sub.length; j++) s += String.fromCharCode(sub[j])
        chunks.push(s)
    }
    return btoa(chunks.join(''))
}

/**
 * 解密文本
 * 输入格式: base64(salt + iv + encrypted)
 */
export async function decryptText(encryptedText: string, password: string): Promise<string> {
    try {
        // 从 Base64 解码（避免 split+map 的 3x 内存开销）
        const raw = atob(encryptedText)
        const combined = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) combined[i] = raw.charCodeAt(i)

        // 提取 salt、IV 和加密数据
        const salt = combined.slice(0, 16)
        const iv = combined.slice(16, 28)
        const encrypted = combined.slice(28)

        // 使用相同的 salt 生成密钥
        const { key } = await generateEncryptionKey(password, salt)

        // 解密
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
        )

        // 转换为文本
        const decoder = new TextDecoder()
        return decoder.decode(decrypted)
    } catch {
        throw new Error('解密失败')
    }
}

/**
 * 加密对象
 */
export async function encryptObject(obj: any, password: string): Promise<string> {
    const json = JSON.stringify(obj)
    return encryptText(json, password)
}

/**
 * 解密对象
 */
export async function decryptObject(encryptedText: string, password: string): Promise<any> {
    const json = await decryptText(encryptedText, password)
    return JSON.parse(json)
}

/**
 * 生成 PIN 码的哈希值
 */
export async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin)

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
}

/**
 * 验证 PIN 码
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
    const pinHash = await hashPin(pin)
    return pinHash === hash
}

/**
 * 检查浏览器是否支持 Web Crypto API
 */
export function isWebCryptoSupported(): boolean {
    return !!(
        window.crypto &&
        window.crypto.subtle &&
        typeof window.crypto.subtle.encrypt === 'function'
    )
}
