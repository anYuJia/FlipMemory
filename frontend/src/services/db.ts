/**
 * IndexedDB 数据库服务
 * 用于离线数据存储和同步队列管理
 */
import Dexie, { type Table } from 'dexie'
import type { MoodType } from '@/types'

// ===== 本地数据类型定义 =====

/**
 * 同步状态
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict'

/**
 * 上传状态
 */
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

/**
 * 本地照片（扩展服务器类型）
 */
export interface LocalPhoto {
    id: string
    key?: string | null
    originalUrl: string
    thumbnailUrl: string
    mediumUrl: string
    takenAt: string | null
    width: number | null
    height: number | null
    order: number
    // 离线上传相关
    _localBlob?: Blob        // 本地未上传的图片 Blob
    _uploadStatus?: UploadStatus
}

/**
 * 本地标签
 */
export interface LocalTag {
    id: string
    name: string
    color: string | null
}

/**
 * 本地记忆（扩展服务器类型，添加同步字段）
 */
export interface LocalMemory {
    id: string
    date: string           // YYYY-MM-DD 格式，主键
    content: string | null
    mood: MoodType | null
    isPrivate: boolean
    weather: string | null
    location: string | null
    photos: LocalPhoto[]
    tags: LocalTag[]
    createdAt: string
    updatedAt: string
    // 离线同步相关字段
    _syncStatus: SyncStatus
    _localUpdatedAt: number  // 本地修改时间戳
    _serverVersion?: number  // 服务器版本号（用于冲突检测）
    _isTemp?: boolean        // 是否是临时创建的（还未同步到服务器）
}

/**
 * 日历缓存数据
 */
export interface LocalCalendarDay {
    date: string            // YYYY-MM-DD 格式，主键
    hasMemory: boolean
    mood: MoodType | null
    thumbnailUrl: string | null
    _cachedAt: number       // 缓存时间戳
}

/**
 * 同步操作类型
 */
export type SyncOperationType = 'create' | 'update' | 'delete'

/**
 * 实体类型
 */
export type EntityType = 'memory' | 'photo'

/**
 * 待同步操作队列项
 */
export interface SyncOperation {
    id?: number             // 自增主键
    type: SyncOperationType
    entityType: EntityType
    entityId: string        // 实体 ID（记忆的 date 或临时 ID）
    data: any               // 操作数据
    createdAt: number       // 创建时间戳
    retryCount: number      // 重试次数
    lastError?: string      // 最后一次错误信息
    priority?: number       // 优先级（数字越小优先级越高）
}

/**
 * 本地用户数据
 */
export interface LocalUser {
    id: string             // 主键
    email: string
    username: string
    nickname: string | null
    avatar: string | null
    avatarUrl: string | null
    settings: any
    _cachedAt: number
}

/**
 * 缓存元数据
 */
export interface CacheMeta {
    key: string            // 主键
    value: any
    updatedAt: number
}

/**
 * 待上传的图片（离线时存储在本地）
 */
export interface PendingPhoto {
    id: string              // 临时 ID
    memoryDate: string      // 关联的记忆日期
    blob: Blob              // 图片二进制数据
    filename: string        // 原始文件名
    mimeType: string        // MIME 类型
    width: number | null
    height: number | null
    takenAt: string | null  // 拍摄时间
    order: number           // 排序顺序
    uploadStatus: UploadStatus
    createdAt: number       // 创建时间
    retryCount: number      // 重试次数
    lastError?: string      // 最后错误信息
}

// ===== Dexie 数据库定义 =====

class FlipMemoryDB extends Dexie {
    // 表定义
    memories!: Table<LocalMemory, string>
    calendarDays!: Table<LocalCalendarDay, string>
    syncQueue!: Table<SyncOperation, number>
    pendingPhotos!: Table<PendingPhoto, string>  // 新增：待上传图片表
    user!: Table<LocalUser, string>
    cacheMeta!: Table<CacheMeta, string>

    constructor() {
        super('FlipMemoryDB')

        // 数据库版本 1
        this.version(1).stores({
            // 记忆表：以 date 为主键，索引 id、同步状态和本地更新时间
            memories: 'date, id, _syncStatus, _localUpdatedAt',
            // 日历缓存表：以 date 为主键，索引缓存时间
            calendarDays: 'date, _cachedAt',
            // 同步队列表：自增主键，索引类型、实体类型、创建时间
            syncQueue: '++id, type, entityType, entityId, createdAt, priority',
            // 用户表：以 id 为主键
            user: 'id, _cachedAt',
            // 缓存元数据表：以 key 为主键
            cacheMeta: 'key, updatedAt',
        })

        // 数据库版本 2 - 添加待上传图片表
        this.version(2).stores({
            memories: 'date, id, _syncStatus, _localUpdatedAt',
            calendarDays: 'date, _cachedAt',
            syncQueue: '++id, type, entityType, entityId, createdAt, priority',
            // 新增：待上传图片表
            pendingPhotos: 'id, memoryDate, uploadStatus, createdAt',
            user: 'id, _cachedAt',
            cacheMeta: 'key, updatedAt',
        })
    }
}

// 创建数据库单例
export const db = new FlipMemoryDB()

// ===== 辅助函数 =====

/**
 * 生成临时 ID（用于离线创建）
 */
export function generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 检查是否是临时 ID
 */
export function isTempId(id: string): boolean {
    return id.startsWith('temp_')
}

/**
 * 获取当前时间戳
 */
export function now(): number {
    return Date.now()
}

/**
 * 清除所有数据（谨慎使用）
 */
export async function clearAllData(): Promise<void> {
    await db.transaction('rw', [db.memories, db.calendarDays, db.syncQueue, db.user, db.cacheMeta], async () => {
        await db.memories.clear()
        await db.calendarDays.clear()
        await db.syncQueue.clear()
        await db.user.clear()
        await db.cacheMeta.clear()
    })
}

/**
 * 获取数据库大致使用量
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
        }
    }
    return { usage: 0, quota: 0 }
}

/**
 * 格式化存储大小
 */
export function formatStorageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export default db
