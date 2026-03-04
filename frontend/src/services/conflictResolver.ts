/**
 * 冲突检测和解决机制
 */

export type ConflictResolutionStrategy = 'local' | 'remote' | 'merge' | 'manual'

export interface ConflictInfo {
    entityType: 'memory' | 'photo'
    entityId: string
    localVersion: any
    remoteVersion: any
    timestamp: number
}

/**
 * 检测冲突
 */
export function detectConflict(
    localVersion: any,
    remoteVersion: any,
    _localTimestamp: number,
    _remoteTimestamp: number
): boolean {
    // 如果版本号不同，说明有冲突
    if (localVersion !== remoteVersion) {
        return true
    }

    // 如果内容不同，说明有冲突
    if (JSON.stringify(localVersion) !== JSON.stringify(remoteVersion)) {
        return true
    }

    return false
}

/**
 * 解决冲突 - 本地优先
 */
export function resolveConflictLocal(
    localVersion: any,
    _remoteVersion: any
): any {
    return localVersion
}

/**
 * 解决冲突 - 远程优先
 */
export function resolveConflictRemote(
    _localVersion: any,
    remoteVersion: any
): any {
    return remoteVersion
}

/**
 * 解决冲突 - 最后修改时间优先
 */
export function resolveConflictLastWrite(
    localVersion: any,
    remoteVersion: any,
    localTimestamp: number,
    remoteTimestamp: number
): any {
    return localTimestamp > remoteTimestamp ? localVersion : remoteVersion
}

/**
 * 解决冲突 - 合并策略（仅适用于记忆对象）
 */
export function resolveConflictMerge(
    localVersion: any,
    remoteVersion: any
): any {
    // 对于记忆对象，合并策略：
    // - 内容：取较长的版本
    // - 标签：合并两个版本的标签
    // - 其他字段：取远程版本（因为服务器是真实来源）

    if (!localVersion || !remoteVersion) {
        return remoteVersion || localVersion
    }

    const merged = { ...remoteVersion }

    // 合并内容：取较长的版本
    if (localVersion.content && remoteVersion.content) {
        if (localVersion.content.length > remoteVersion.content.length) {
            merged.content = localVersion.content
        }
    } else if (localVersion.content) {
        merged.content = localVersion.content
    }

    // 合并标签：去重后合并
    if (localVersion.tags && remoteVersion.tags) {
        const allTags = new Set([...localVersion.tags, ...remoteVersion.tags])
        merged.tags = Array.from(allTags)
    } else if (localVersion.tags) {
        merged.tags = localVersion.tags
    }

    return merged
}

/**
 * 应用冲突解决策略
 */
export function applyConflictResolution(
    strategy: ConflictResolutionStrategy,
    localVersion: any,
    remoteVersion: any,
    localTimestamp: number,
    remoteTimestamp: number
): any {
    switch (strategy) {
        case 'local':
            return resolveConflictLocal(localVersion, remoteVersion)
        case 'remote':
            return resolveConflictRemote(localVersion, remoteVersion)
        case 'merge':
            return resolveConflictMerge(localVersion, remoteVersion)
        case 'manual':
            // 手动解决需要用户干预，这里返回 null
            return null
        default:
            // 默认使用最后修改时间优先
            return resolveConflictLastWrite(
                localVersion,
                remoteVersion,
                localTimestamp,
                remoteTimestamp
            )
    }
}

/**
 * 版本号生成（使用时间戳 + 随机数）
 */
export function generateVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 比较版本号
 */
export function compareVersions(v1: string, v2: string): number {
    const t1 = parseInt(v1.split('-')[0] ?? '0')
    const t2 = parseInt(v2.split('-')[0] ?? '0')

    if (t1 > t2) return 1
    if (t1 < t2) return -1
    return 0
}
