/**
 * 数据加密服务
 * 使用 Web Crypto API 进行端到端加密
 */

/**
 * 生成加密密钥
 * @param password 用户密码
 * @param salt 可选的 salt，如果不提供则生成新的
 * @returns 密钥和使用的 salt
 */
export async function generateEncryptionKey(
    password: string,
    salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
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

    return { key, salt: usedSalt }
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

    // 转换为 Base64
    return btoa(String.fromCharCode(...combined))
}

/**
 * 解密文本
 * 输入格式: base64(salt + iv + encrypted)
 */
export async function decryptText(encryptedText: string, password: string): Promise<string> {
    try {
        // 从 Base64 解码
        const combined = new Uint8Array(
            atob(encryptedText)
                .split('')
                .map(c => c.charCodeAt(0))
        )

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
