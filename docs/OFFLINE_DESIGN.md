# 🔌 FlipMemory 离线功能设计文档

> 让记忆永不断线 —— 即使在没有网络的情况下，也能无缝记录和查看你的珍贵回忆

## 📋 目录

1. [功能概述](#功能概述)
2. [技术架构](#技术架构)
3. [核心模块设计](#核心模块设计)
4. [数据存储方案](#数据存储方案)
5. [同步策略](#同步策略)
6. [用户体验设计](#用户体验设计)
7. [实现步骤](#实现步骤)

---

## 功能概述

### 🎯 目标

为 FlipMemory 添加完整的离线支持能力，使用户能够：

- **📖 离线查看**：在无网络环境下浏览已缓存的记忆
- **✏️ 离线创建**：无网络时创建新记忆，恢复网络后自动同步
- **🔄 智能同步**：自动检测网络状态，智能处理数据同步
- **💾 增量缓存**：按需缓存记忆数据，节省存储空间

### 📊 优先级划分

| 优先级 | 功能 | 描述 |
|--------|------|------|
| P0 | Service Worker 基础架构 | PWA 核心，支持离线访问 |
| P0 | 本地数据存储 (IndexedDB) | 存储记忆数据 |
| P0 | 网络状态检测 | 实时检测并响应网络变化 |
| P1 | 离线查看已缓存记忆 | 浏览本地存储的记忆 |
| P1 | 离线创建记忆 | 支持离线新建记忆 |
| P1 | 自动同步机制 | 恢复网络后同步数据 |
| P2 | 离线更新记忆 | 支持离线编辑记忆 |
| P2 | 离线删除记忆 | 支持离线删除（标记删除） |
| P2 | 冲突解决策略 | 处理同步冲突 |
| P3 | 离线图片上传队列 | 图片暂存本地后上传 |
| P3 | 存储空间管理 | 用户可控制缓存大小 |

---

## 技术架构

### 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      FlipMemory App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Views     │  │   Stores    │  │    Composables      │  │
│  │  (Vue组件)   │──│  (Pinia)    │──│  (useOffline等)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│          │                │                   │              │
│  ┌───────┴────────────────┴───────────────────┴─────────┐   │
│  │                  Offline Service Layer                │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │   │
│  │  │ OfflineStore │  │ SyncManager   │  │ CacheManager│ │   │
│  │  └──────────────┘  └───────────────┘  └────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│          │                │                   │              │
│  ┌───────┴────────────────┴───────────────────┴─────────┐   │
│  │                  Storage Layer                        │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │   │
│  │  │  IndexedDB   │  │ LocalStorage  │  │ Cache API  │ │   │
│  │  │  (记忆数据)   │  │  (设置/配置)   │  │ (静态资源)  │ │   │
│  │  └──────────────┘  └───────────────┘  └────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Service Worker                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • 静态资源缓存  • API 请求拦截  • 后台同步              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Backend API      │
                    └───────────────────┘
```

### 📦 技术选型

| 技术 | 用途 | 原因 |
|------|------|------|
| **Vite PWA Plugin** | Service Worker 生成 | 与 Vite 无缝集成，自动管理 SW 生命周期 |
| **IndexedDB (via Dexie.js)** | 结构化数据存储 | 容量大，支持事务，适合存储记忆数据 |
| **Workbox** | SW 运行时库 | 简化缓存策略实现 |
| **@vueuse/core** | 响应式工具 | 已在项目中使用，提供 `useOnline` 等 hook |

---

## 核心模块设计

### 1️⃣ Service Worker 模块

#### 文件结构

```
frontend/
├── src/
│   ├── sw/
│   │   └── sw.ts                 # Service Worker 入口
│   └── ...
├── vite.config.ts                # PWA 配置
└── public/
    └── manifest.json             # PWA Manifest
```

#### Service Worker 策略

```typescript
// src/sw/sw.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// 预缓存静态资源
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// API 请求策略：网络优先，降级到缓存
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
      }),
    ],
  })
)

// 图片缓存策略：缓存优先
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
      }),
    ],
  })
)
```

### 2️⃣ 本地数据库模块

#### 数据库 Schema 设计

```typescript
// src/services/db.ts
import Dexie, { Table } from 'dexie'

// 本地记忆类型（扩展服务器类型）
export interface LocalMemory {
  id: string
  date: string
  content: string | null
  mood: string | null
  isPrivate: boolean
  weather: string | null
  location: string | null
  photos: LocalPhoto[]
  tags: LocalTag[]
  createdAt: string
  updatedAt: string
  // 离线同步相关字段
  _syncStatus: 'synced' | 'pending' | 'conflict'
  _localUpdatedAt: number  // 本地修改时间戳
  _serverVersion?: number  // 服务器版本号
}

export interface LocalPhoto {
  id: string
  originalUrl: string
  thumbnailUrl: string
  mediumUrl: string
  takenAt: string | null
  width: number | null
  height: number | null
  order: number
  // 离线上传相关
  _localBlob?: Blob        // 本地未上传的图片
  _uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'failed'
}

export interface LocalTag {
  id: string
  name: string
  color: string | null
}

// 日历缓存
export interface LocalCalendarDay {
  date: string
  hasMemory: boolean
  mood: string | null
  thumbnailUrl: string | null
  _cachedAt: number
}

// 待同步操作队列
export interface SyncOperation {
  id?: number
  type: 'create' | 'update' | 'delete'
  entityType: 'memory' | 'photo'
  entityId: string
  data: any
  createdAt: number
  retryCount: number
  lastError?: string
}

// 用户数据
export interface LocalUser {
  id: string
  email: string
  username: string
  nickname: string | null
  avatar: string | null
  avatarUrl: string | null
  settings: any
  _cachedAt: number
}

class FlipMemoryDB extends Dexie {
  memories!: Table<LocalMemory, string>
  calendarDays!: Table<LocalCalendarDay, string>
  syncQueue!: Table<SyncOperation, number>
  user!: Table<LocalUser, string>

  constructor() {
    super('FlipMemoryDB')
    
    this.version(1).stores({
      memories: 'id, date, _syncStatus, _localUpdatedAt',
      calendarDays: 'date, _cachedAt',
      syncQueue: '++id, type, entityType, entityId, createdAt',
      user: 'id, _cachedAt',
    })
  }
}

export const db = new FlipMemoryDB()
```

### 3️⃣ Offline Store 模块

```typescript
// src/stores/offline.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useOnline, useStorage } from '@vueuse/core'
import { db, LocalMemory, SyncOperation } from '@/services/db'

export const useOfflineStore = defineStore('offline', () => {
  // ===== 状态 =====
  const isOnline = useOnline()
  const isSyncing = ref(false)
  const lastSyncTime = useStorage<number | null>('lastSyncTime', null)
  const pendingOperations = ref<number>(0)
  const syncError = ref<string | null>(null)
  
  // 离线模式设置（用户可手动开启离线模式）
  const offlineModeEnabled = useStorage('offlineModeEnabled', true)
  
  // ===== 计算属性 =====
  const isOfflineMode = computed(() => {
    return !isOnline.value || offlineModeEnabled.value
  })
  
  const hasPendingSync = computed(() => pendingOperations.value > 0)
  
  const syncStatus = computed(() => {
    if (isSyncing.value) return 'syncing'
    if (!isOnline.value) return 'offline'
    if (pendingOperations.value > 0) return 'pending'
    return 'synced'
  })

  // ===== 初始化 =====
  async function init() {
    await updatePendingCount()
    
    // 监听网络状态变化
    watch(isOnline, async (online) => {
      if (online && hasPendingSync.value) {
        await syncPendingOperations()
      }
    })
  }

  // ===== 待同步队列管理 =====
  async function updatePendingCount() {
    pendingOperations.value = await db.syncQueue.count()
  }

  async function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>) {
    await db.syncQueue.add({
      ...operation,
      createdAt: Date.now(),
      retryCount: 0,
    })
    await updatePendingCount()
  }

  // ===== 同步操作 =====
  async function syncPendingOperations() {
    if (isSyncing.value || !isOnline.value) return
    
    isSyncing.value = true
    syncError.value = null
    
    try {
      const operations = await db.syncQueue.orderBy('createdAt').toArray()
      
      for (const op of operations) {
        try {
          await processOperation(op)
          await db.syncQueue.delete(op.id!)
        } catch (error) {
          // 更新重试次数
          await db.syncQueue.update(op.id!, {
            retryCount: op.retryCount + 1,
            lastError: error instanceof Error ? error.message : '同步失败',
          })
          
          // 超过最大重试次数，跳过
          if (op.retryCount >= 3) {
            console.error('Sync operation failed after 3 retries:', op)
          }
        }
      }
      
      lastSyncTime.value = Date.now()
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : '同步失败'
    } finally {
      isSyncing.value = false
      await updatePendingCount()
    }
  }

  async function processOperation(op: SyncOperation) {
    // 具体的同步逻辑，调用 API
    const { api } = await import('@/services/api')
    
    switch (op.type) {
      case 'create':
        if (op.entityType === 'memory') {
          await api.memories.create(op.data)
        }
        break
      case 'update':
        if (op.entityType === 'memory') {
          await api.memories.update(op.entityId, op.data)
        }
        break
      case 'delete':
        if (op.entityType === 'memory') {
          await api.memories.delete(op.entityId)
        }
        break
    }
  }

  // ===== 本地数据管理 =====
  async function getLocalMemory(date: string): Promise<LocalMemory | null> {
    return await db.memories.get(date) || null
  }

  async function saveLocalMemory(memory: LocalMemory) {
    await db.memories.put(memory)
  }

  async function getLocalCalendarDays(year: number, month: number) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return await db.calendarDays
      .where('date')
      .startsWith(prefix)
      .toArray()
  }

  async function saveLocalCalendarDays(days: LocalCalendarDay[]) {
    await db.calendarDays.bulkPut(days)
  }

  // ===== 缓存管理 =====
  async function getCacheSize(): Promise<number> {
    // 获取 IndexedDB 大致使用量
    const estimate = await navigator.storage?.estimate()
    return estimate?.usage || 0
  }

  async function clearCache() {
    await db.memories.clear()
    await db.calendarDays.clear()
    // 保留同步队列，避免数据丢失
  }
  
  async function clearSyncQueue() {
    await db.syncQueue.clear()
    await updatePendingCount()
  }

  return {
    // 状态
    isOnline,
    isOfflineMode,
    isSyncing,
    lastSyncTime,
    pendingOperations,
    hasPendingSync,
    syncStatus,
    syncError,
    offlineModeEnabled,
    // 方法
    init,
    addToSyncQueue,
    syncPendingOperations,
    getLocalMemory,
    saveLocalMemory,
    getLocalCalendarDays,
    saveLocalCalendarDays,
    getCacheSize,
    clearCache,
    clearSyncQueue,
  }
})
```

### 4️⃣ 增强版 API 服务

```typescript
// src/services/offlineApi.ts
import { db } from '@/services/db'
import api from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import type { Memory, CreateMemoryInput, CalendarDay } from '@/types'

/**
 * 离线优先的 API 包装器
 * 在线时使用网络请求并缓存，离线时使用本地缓存
 */
export const offlineApi = {
  memories: {
    /**
     * 获取日历数据（离线优先）
     */
    async getCalendar(year: number, month: number) {
      const offlineStore = useOfflineStore()
      
      // 如果在线，尝试从服务器获取
      if (offlineStore.isOnline) {
        try {
          const response = await api.memories.getCalendar(year, month)
          // 缓存到本地
          const days = response.days.map((day: CalendarDay) => ({
            ...day,
            _cachedAt: Date.now(),
          }))
          await offlineStore.saveLocalCalendarDays(days)
          return response
        } catch (error) {
          console.warn('Failed to fetch from server, falling back to cache:', error)
        }
      }
      
      // 从本地缓存获取
      const localDays = await offlineStore.getLocalCalendarDays(year, month)
      return { days: localDays }
    },

    /**
     * 获取指定日期的记忆（离线优先）
     */
    async getByDate(date: string): Promise<Memory | null> {
      const offlineStore = useOfflineStore()
      
      if (offlineStore.isOnline) {
        try {
          const memory = await api.memories.getByDate(date)
          if (memory) {
            // 缓存到本地
            await offlineStore.saveLocalMemory({
              ...memory,
              _syncStatus: 'synced',
              _localUpdatedAt: Date.now(),
            })
          }
          return memory
        } catch (error) {
          console.warn('Failed to fetch from server, falling back to cache:', error)
        }
      }
      
      // 从本地缓存获取
      const localMemory = await offlineStore.getLocalMemory(date)
      return localMemory
    },

    /**
     * 创建记忆（支持离线）
     */
    async create(input: CreateMemoryInput): Promise<Memory> {
      const offlineStore = useOfflineStore()
      
      // 生成临时 ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const localMemory = {
        id: tempId,
        date: input.date,
        content: input.content || null,
        mood: input.mood || null,
        isPrivate: false,
        weather: input.weather || null,
        location: input.location || null,
        photos: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _syncStatus: offlineStore.isOnline ? 'synced' : 'pending' as const,
        _localUpdatedAt: Date.now(),
      }
      
      if (offlineStore.isOnline) {
        try {
          const memory = await api.memories.create(input)
          // 更新本地缓存
          await offlineStore.saveLocalMemory({
            ...memory,
            _syncStatus: 'synced',
            _localUpdatedAt: Date.now(),
          })
          return memory
        } catch (error) {
          console.warn('Failed to create on server, saving locally:', error)
        }
      }
      
      // 离线模式：保存到本地并加入同步队列
      await offlineStore.saveLocalMemory(localMemory as any)
      await offlineStore.addToSyncQueue({
        type: 'create',
        entityType: 'memory',
        entityId: tempId,
        data: input,
      })
      
      return localMemory as any
    },

    /**
     * 更新记忆（支持离线）
     */
    async update(date: string, input: Partial<Memory>): Promise<Memory | null> {
      const offlineStore = useOfflineStore()
      
      // 获取现有记忆
      const existing = await offlineStore.getLocalMemory(date)
      if (!existing) return null
      
      const updatedMemory = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
        _syncStatus: offlineStore.isOnline ? 'synced' : 'pending' as const,
        _localUpdatedAt: Date.now(),
      }
      
      if (offlineStore.isOnline) {
        try {
          const memory = await api.memories.update(date, input)
          await offlineStore.saveLocalMemory({
            ...memory,
            _syncStatus: 'synced',
            _localUpdatedAt: Date.now(),
          })
          return memory
        } catch (error) {
          console.warn('Failed to update on server, saving locally:', error)
        }
      }
      
      // 离线模式
      await offlineStore.saveLocalMemory(updatedMemory)
      await offlineStore.addToSyncQueue({
        type: 'update',
        entityType: 'memory',
        entityId: existing.id,
        data: input,
      })
      
      return updatedMemory as any
    },

    /**
     * 删除记忆（支持离线）
     */
    async delete(date: string): Promise<boolean> {
      const offlineStore = useOfflineStore()
      
      const existing = await offlineStore.getLocalMemory(date)
      if (!existing) return false
      
      if (offlineStore.isOnline) {
        try {
          await api.memories.delete(date)
          await db.memories.delete(date)
          return true
        } catch (error) {
          console.warn('Failed to delete on server, marking for deletion:', error)
        }
      }
      
      // 离线模式：标记删除
      await offlineStore.addToSyncQueue({
        type: 'delete',
        entityType: 'memory',
        entityId: existing.id,
        data: { date },
      })
      
      // 从本地删除
      await db.memories.delete(date)
      return true
    },
  },
}
```

### 5️⃣ Composable Hook

```typescript
// src/composables/useOffline.ts
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useOfflineStore } from '@/stores/offline'

export function useOffline() {
  const offlineStore = useOfflineStore()
  const { 
    isOnline, 
    isSyncing, 
    pendingOperations, 
    syncStatus, 
    lastSyncTime,
    syncError,
  } = storeToRefs(offlineStore)

  // 格式化上次同步时间
  const lastSyncTimeFormatted = computed(() => {
    if (!lastSyncTime.value) return '从未同步'
    
    const diff = Date.now() - lastSyncTime.value
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    return `${days} 天前`
  })

  // 同步状态文本
  const syncStatusText = computed(() => {
    switch (syncStatus.value) {
      case 'syncing': return '同步中...'
      case 'offline': return '离线模式'
      case 'pending': return `${pendingOperations.value} 条待同步`
      case 'synced': return '已同步'
      default: return ''
    }
  })

  // 同步状态颜色
  const syncStatusColor = computed(() => {
    switch (syncStatus.value) {
      case 'syncing': return 'text-blue-500'
      case 'offline': return 'text-gray-500'
      case 'pending': return 'text-orange-500'
      case 'synced': return 'text-green-500'
      default: return ''
    }
  })

  // 手动触发同步
  async function triggerSync() {
    if (isOnline.value) {
      await offlineStore.syncPendingOperations()
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingOperations,
    syncStatus,
    syncError,
    lastSyncTime,
    lastSyncTimeFormatted,
    syncStatusText,
    syncStatusColor,
    triggerSync,
  }
}
```

---

## 数据存储方案

### 📊 存储分层

```
┌─────────────────────────────────────────────┐
│              存储策略层级                     │
├─────────────┬───────────────┬───────────────┤
│   层级       │    存储方式    │    用途        │
├─────────────┼───────────────┼───────────────┤
│  L1 (热)    │  Pinia Store  │  当前会话数据   │
│  L2 (温)    │  LocalStorage │  设置/Token    │
│  L3 (冷)    │  IndexedDB    │  记忆数据缓存   │
│  L4 (静态)  │  Cache API    │  应用资源缓存   │
└─────────────┴───────────────┴───────────────┘
```

### 💾 缓存容量管理

```typescript
// src/services/cacheManager.ts
export class CacheManager {
  // 默认最大缓存 50MB
  private maxCacheSize = 50 * 1024 * 1024
  
  // 最大缓存记忆数量
  private maxMemories = 500
  
  // 最大图片缓存数量
  private maxImages = 200
  
  /**
   * 检查并清理过期缓存
   */
  async cleanup() {
    const currentSize = await this.getCacheSize()
    
    if (currentSize > this.maxCacheSize * 0.9) {
      await this.evictOldestEntries()
    }
  }
  
  /**
   * 使用 LRU 策略清理
   */
  private async evictOldestEntries() {
    // 按 _cachedAt 排序，删除最旧的 20%
    const memories = await db.memories
      .orderBy('_localUpdatedAt')
      .limit(Math.floor(this.maxMemories * 0.2))
      .toArray()
    
    // 只删除已同步的数据，保留待同步的
    const toDelete = memories
      .filter(m => m._syncStatus === 'synced')
      .map(m => m.date)
    
    await db.memories.bulkDelete(toDelete)
  }
  
  async getCacheSize(): Promise<number> {
    const estimate = await navigator.storage?.estimate()
    return estimate?.usage || 0
  }
  
  async getCacheSizeFormatted(): Promise<string> {
    const size = await this.getCacheSize()
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
}

export const cacheManager = new CacheManager()
```

---

## 同步策略

### 🔄 同步状态机

```
           ┌─────────────┐
           │   SYNCED    │◄──────────────┐
           └──────┬──────┘               │
                  │ 本地修改              │ 同步成功
                  ▼                      │
           ┌─────────────┐               │
  ┌───────►│   PENDING   │───────────────┘
  │        └──────┬──────┘
  │               │ 同步失败
  │               ▼
  │        ┌─────────────┐
  │        │   CONFLICT  │
  │        └──────┬──────┘
  │               │ 用户解决
  │               ▼
  └───────────────┘
```

### 🎛️ 冲突解决策略

```typescript
// src/services/conflictResolver.ts

export type ConflictResolution = 'local' | 'server' | 'merge' | 'manual'

export interface Conflict {
  id: string
  date: string
  localVersion: LocalMemory
  serverVersion: Memory
  detectedAt: number
}

export class ConflictResolver {
  // 默认策略：本地优先（用户数据最重要）
  private defaultStrategy: ConflictResolution = 'local'
  
  /**
   * 检测并解决冲突
   */
  async resolveConflict(
    local: LocalMemory,
    server: Memory,
    strategy: ConflictResolution = this.defaultStrategy
  ): Promise<LocalMemory> {
    switch (strategy) {
      case 'local':
        return {
          ...local,
          _syncStatus: 'pending',
        }
        
      case 'server':
        return {
          ...server,
          _syncStatus: 'synced',
          _localUpdatedAt: Date.now(),
        } as LocalMemory
        
      case 'merge':
        return this.mergeVersions(local, server)
        
      case 'manual':
        // 触发 UI 让用户选择
        throw new Error('Manual resolution required')
    }
  }
  
  /**
   * 智能合并两个版本
   */
  private mergeVersions(local: LocalMemory, server: Memory): LocalMemory {
    return {
      ...server,
      // 如果本地有更新的内容，保留本地
      content: local._localUpdatedAt > new Date(server.updatedAt).getTime() 
        ? local.content 
        : server.content,
      mood: local.mood || server.mood,
      _syncStatus: 'pending',
      _localUpdatedAt: Date.now(),
    } as LocalMemory
  }
}
```

---

## 用户体验设计

### 🎨 UI 组件

#### 1. 同步状态指示器

```vue
<!-- src/components/SyncStatusIndicator.vue -->
<script setup lang="ts">
import { useOffline } from '@/composables/useOffline'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-vue-next'

const { 
  isOnline, 
  isSyncing, 
  syncStatus, 
  syncStatusText, 
  pendingOperations,
  triggerSync,
} = useOffline()
</script>

<template>
  <div class="sync-indicator">
    <!-- 离线状态 -->
    <button 
      v-if="!isOnline"
      class="status-badge offline"
      @click="triggerSync"
    >
      <CloudOff class="icon" />
      <span>离线</span>
    </button>
    
    <!-- 同步中 -->
    <div v-else-if="isSyncing" class="status-badge syncing">
      <RefreshCw class="icon animate-spin" />
      <span>同步中</span>
    </div>
    
    <!-- 待同步 -->
    <button 
      v-else-if="pendingOperations > 0"
      class="status-badge pending"
      @click="triggerSync"
    >
      <Cloud class="icon" />
      <span>{{ pendingOperations }} 待同步</span>
    </button>
    
    <!-- 已同步 -->
    <div v-else class="status-badge synced">
      <Check class="icon" />
      <span>已同步</span>
    </div>
  </div>
</template>

<style scoped>
.sync-indicator {
  display: inline-flex;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.status-badge .icon {
  width: 14px;
  height: 14px;
}

.offline {
  background: rgba(156, 163, 175, 0.15);
  color: #6b7280;
}

.syncing {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.pending {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
  cursor: pointer;
}

.pending:hover {
  background: rgba(249, 115, 22, 0.25);
}

.synced {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
</style>
```

#### 2. 离线横幅提示

```vue
<!-- src/components/OfflineBanner.vue -->
<script setup lang="ts">
import { useOffline } from '@/composables/useOffline'
import { WifiOff, RefreshCw } from 'lucide-vue-next'

const { isOnline, isSyncing, pendingOperations, triggerSync } = useOffline()
</script>

<template>
  <Transition name="slide-down">
    <div v-if="!isOnline" class="offline-banner">
      <WifiOff class="w-4 h-4" />
      <span>当前处于离线模式</span>
      <span v-if="pendingOperations > 0" class="pending-count">
        {{ pendingOperations }} 条待同步
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.pending-count {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 12px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
```

#### 3. 设置页面 - 离线管理

```vue
<!-- 添加到 SettingsView.vue 的数据管理部分 -->
<template>
  <!-- 离线与同步 -->
  <section class="mb-5">
    <div class="card rounded-2xl overflow-hidden">
      <div class="px-5 py-2.5 bg-tertiary">
        <span class="text-xs font-medium text-muted">离线与同步</span>
      </div>
      
      <!-- 同步状态 -->
      <div class="flex items-center gap-4 px-5 py-4">
        <div class="icon-box bg-gradient-blue">
          <Cloud class="w-5 h-5 text-blue-500" />
        </div>
        <div class="flex-1">
          <div class="font-medium">同步状态</div>
          <div class="text-sm mt-0.5 text-muted">{{ syncStatusText }}</div>
        </div>
        <SyncStatusIndicator />
      </div>
      
      <div class="divider" />
      
      <!-- 缓存大小 -->
      <div class="flex items-center gap-4 px-5 py-4">
        <div class="icon-box bg-gradient-purple">
          <HardDrive class="w-5 h-5 text-purple-500" />
        </div>
        <div class="flex-1">
          <div class="font-medium">本地缓存</div>
          <div class="text-sm mt-0.5 text-muted">{{ cacheSize }}</div>
        </div>
        <button 
          @click="clearCache" 
          class="text-sm text-red-500 hover:text-red-600"
        >
          清除
        </button>
      </div>
      
      <div class="divider" />
      
      <!-- 离线模式开关 -->
      <div class="flex items-center gap-4 px-5 py-4">
        <div class="icon-box bg-gradient-gray">
          <WifiOff class="w-5 h-5 text-gray-500" />
        </div>
        <div class="flex-1">
          <div class="font-medium">离线优先模式</div>
          <div class="text-sm mt-0.5 text-muted">优先使用本地数据</div>
        </div>
        <ToggleSwitch v-model="offlineModeEnabled" />
      </div>
    </div>
  </section>
</template>
```

---

## 实现步骤

### 📅 Phase 1: 基础架构 (已完成 ✅)

- [x] **Step 1.1**: 安装依赖
  ```bash
  npm install vite-plugin-pwa workbox-window dexie
  ```

- [x] **Step 1.2**: 配置 Vite PWA 插件 (`vite.config.ts`)

- [x] **Step 1.3**: 创建 IndexedDB 数据库 Schema (`src/services/db.ts`)

- [x] **Step 1.4**: 实现 Service Worker 基础配置 (`src/sw/sw.ts`)

- [x] **Step 1.5**: 创建 PWA 图标和 Manifest

### 📅 Phase 2: 离线存储 (已完成 ✅)

- [x] **Step 2.1**: 实现 `useOfflineStore` (`src/stores/offline.ts`)

- [x] **Step 2.2**: 实现 `offlineApi` 包装器 (`src/services/offlineApi.ts`)

- [x] **Step 2.3**: 实现同步队列管理 (集成在 offline.ts 中)

- [x] **Step 2.4**: 实现缓存管理功能 (集成在 offline.ts 中)

### 📅 Phase 3: 集成与 UI (已完成 ✅)

- [x] **Step 3.1**: 创建 `useOffline` composable (`src/composables/useOffline.ts`)

- [x] **Step 3.2**: 实现同步状态指示器组件 (`src/components/SyncStatusIndicator.vue`)

- [x] **Step 3.3**: 实现离线横幅组件 (`src/components/OfflineBanner.vue`)

- [x] **Step 3.4**: 在设置页面添加离线管理功能 (`SettingsView.vue`)

- [x] **Step 3.5**: 更新 Memory Store 集成离线 API (`src/stores/memory.ts`)

### 📅 Phase 4: 测试与优化 (待完成)

- [ ] **Step 4.1**: 离线场景测试

- [ ] **Step 4.2**: 同步冲突测试

- [ ] **Step 4.3**: 性能优化

- [ ] **Step 4.4**: 边界情况处理

---

## 🔧 配置参考

### vite.config.ts 更新

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'FlipMemory',
        short_name: 'FlipMemory',
        description: '翻转记忆 —— 用翻转卡片的方式，记录生活中的美好瞬间',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
```

### public/manifest.json

```json
{
  "name": "FlipMemory",
  "short_name": "FlipMemory",
  "description": "翻转记忆 —— 用翻转卡片的方式，记录生活中的美好瞬间",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📝 注意事项

1. **数据安全**：待同步的数据会保留在本地，即使清除缓存也不会丢失
2. **存储限制**：浏览器 IndexedDB 通常有 50-100MB 限制，需要做好容量管理
3. **图片处理**：大图片建议压缩后存储，或只缓存缩略图
4. **隐私锁兼容**：离线模式下仍需要验证隐私锁
5. **后台同步**：可以考虑使用 Background Sync API 进行后台同步

---

## ✅ 验收标准

1. 用户可以在离线状态下查看已缓存的记忆
2. 用户可以在离线状态下创建新记忆
3. 恢复网络后，数据能够自动同步
4. 用户可以在设置中查看同步状态和缓存大小
5. 用户可以手动清除缓存
6. 离线状态有明显的 UI 提示
</CodeContent>
