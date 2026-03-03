# 集成测试指南

## 概述

集成测试验证多个组件或模块之间的交互。在 FlipMemory 中，我们关注以下集成场景：

1. **离线功能集成** - 离线创建、同步、冲突解决
2. **图片处理集成** - 上传、处理、存储
3. **认证流程集成** - 登录、Token 刷新、权限检查
4. **数据同步集成** - 本地数据与服务器同步

## 测试环境设置

### 前端集成测试

```bash
# 安装依赖
npm install --save-dev @vue/test-utils happy-dom

# 运行集成测试
npm run test -- --grep "integration"
```

### 后端集成测试

```bash
# 安装依赖
npm install --save-dev supertest @types/supertest

# 运行集成测试
npm run test -- --grep "integration"
```

## 前端集成测试示例

### 1. 离线功能集成测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useMemoryStore } from '@/stores/memory'
import { useOfflineStore } from '@/stores/offline'
import { offlineApi } from '@/services/offlineApi'

describe('Offline Integration', () => {
  let memoryStore
  let offlineStore

  beforeEach(() => {
    memoryStore = useMemoryStore()
    offlineStore = useOfflineStore()
  })

  it('should create memory offline and sync when online', async () => {
    // 1. 设置离线模式
    offlineStore.offlineModeEnabled = true

    // 2. 创建记忆
    const memory = await offlineApi.memories.create({
      date: '2024-02-09',
      content: 'Test memory',
      mood: 'happy',
    })

    expect(memory).toBeDefined()
    expect(memory._syncStatus).toBe('pending')

    // 3. 验证本地存储
    const stored = await offlineStore.getLocalMemory('2024-02-09')
    expect(stored).toBeDefined()

    // 4. 模拟上线
    offlineStore.offlineModeEnabled = false
    offlineStore.isOnline = true

    // 5. 触发同步
    await offlineStore.syncPendingChanges()

    // 6. 验证同步状态
    const synced = await offlineStore.getLocalMemory('2024-02-09')
    expect(synced._syncStatus).toBe('synced')
  })

  it('should detect and resolve conflicts', async () => {
    // 1. 创建本地修改
    const localMemory = {
      date: '2024-02-09',
      content: 'Local content',
      mood: 'happy',
    }

    // 2. 模拟服务器修改
    const remoteMemory = {
      date: '2024-02-09',
      content: 'Remote content',
      mood: 'sad',
    }

    // 3. 检测冲突
    const hasConflict = detectConflict(
      localMemory,
      remoteMemory,
      Date.now(),
      Date.now() - 1000
    )

    expect(hasConflict).toBe(true)

    // 4. 解决冲突
    const resolved = applyConflictResolution(
      'merge',
      localMemory,
      remoteMemory,
      Date.now(),
      Date.now() - 1000
    )

    expect(resolved).toBeDefined()
  })
})
```

### 2. 认证流程集成测试

```typescript
describe('Authentication Integration', () => {
  it('should complete login flow', async () => {
    // 1. 登录
    const response = await api.auth.login({
      account: 'test@example.com',
      password: 'password123',
    })

    expect(response.accessToken).toBeDefined()

    // 2. 保存 token
    saveToken(response.accessToken, 3600)

    // 3. 验证认证状态
    expect(isAuthenticated()).toBe(true)

    // 4. 获取用户信息
    const user = await api.auth.me()
    expect(user).toBeDefined()

    // 5. 登出
    removeToken()
    expect(isAuthenticated()).toBe(false)
  })

  it('should refresh token when expired', async () => {
    // 1. 设置过期 token
    saveToken('expired-token', -1)
    expect(isTokenExpired()).toBe(true)

    // 2. 刷新 token
    const newToken = await api.auth.refreshToken()
    saveToken(newToken, 3600)

    // 3. 验证新 token
    expect(isTokenExpired()).toBe(false)
  })
})
```

## 后端集成测试示例

### 1. 图片处理集成测试

```typescript
import request from 'supertest'
import { app } from '@/app'

describe('Image Processing Integration', () => {
  it('should process uploaded image', async () => {
    // 1. 获取预签名 URL
    const presignResponse = await request(app)
      .post('/api/upload/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
      })

    expect(presignResponse.status).toBe(200)
    const { uploadUrl, key } = presignResponse.body.data

    // 2. 上传图片（模拟）
    // 实际上传到 MinIO

    // 3. 确认上传完成
    const confirmResponse = await request(app)
      .post('/api/upload/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({
        key,
        takenAt: new Date(),
        width: 1920,
        height: 1080,
      })

    expect(confirmResponse.status).toBe(200)
    const { photo } = confirmResponse.body.data

    // 4. 验证处理结果
    expect(photo.originalKey).toBeDefined()
    expect(photo.thumbnailKey).toBeDefined()
    expect(photo.mediumKey).toBeDefined()
  })
})
```

### 2. 记忆创建集成测试

```typescript
describe('Memory Creation Integration', () => {
  it('should create memory with photos', async () => {
    // 1. 创建记忆
    const createResponse = await request(app)
      .post('/api/memories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2024-02-09',
        content: 'Test memory',
        mood: 'happy',
        photoKeys: ['uploads/user/photo1.webp'],
      })

    expect(createResponse.status).toBe(201)
    const { memory } = createResponse.body.data

    // 2. 验证记忆创建
    expect(memory.date).toBe('2024-02-09')
    expect(memory.photos).toHaveLength(1)

    // 3. 获取记忆
    const getResponse = await request(app)
      .get(`/api/memories/${memory.date}`)
      .set('Authorization', `Bearer ${token}`)

    expect(getResponse.status).toBe(200)
    expect(getResponse.body.data.id).toBe(memory.id)
  })
})
```

## 测试数据管理

### 使用 Fixtures

```typescript
// fixtures/memories.ts
export const mockMemories = [
  {
    date: '2024-02-09',
    content: 'Happy day',
    mood: 'happy',
  },
  {
    date: '2024-02-08',
    content: 'Sad day',
    mood: 'sad',
  },
]

// 在测试中使用
import { mockMemories } from '@/fixtures/memories'

beforeEach(() => {
  mockMemories.forEach(memory => {
    // 创建测试数据
  })
})
```

### 数据库清理

```typescript
beforeEach(async () => {
  // 清理测试数据
  await db.memories.clear()
  await db.photos.clear()
})

afterEach(async () => {
  // 清理测试数据
  await db.memories.clear()
  await db.photos.clear()
})
```

## 性能测试

### 基准测试

```typescript
import { bench, describe } from 'vitest'

describe('Performance Benchmarks', () => {
  bench('should create memory quickly', async () => {
    await offlineApi.memories.create({
      date: '2024-02-09',
      content: 'Test',
      mood: 'happy',
    })
  })

  bench('should sync 100 memories', async () => {
    for (let i = 0; i < 100; i++) {
      await offlineStore.addToSyncQueue({
        type: 'create',
        entityType: 'memory',
        entityId: `memory-${i}`,
        data: {},
      })
    }
    await offlineStore.syncPendingChanges()
  })
})
```

## CI/CD 集成

集成测试已集成到 GitHub Actions：

```yaml
- name: Run integration tests
  run: npm run test:integration

- name: Run backend integration tests
  run: cd server && npm run test:integration
```

## 最佳实践

1. **隔离测试** - 每个测试应该独立运行
2. **清理状态** - 使用 beforeEach/afterEach 清理
3. **使用 Fixtures** - 复用测试数据
4. **模拟外部服务** - Mock API、数据库等
5. **测试真实场景** - 测试用户实际使用的流程
6. **性能测试** - 监控关键操作的性能

## 常见问题

### Q: 如何测试异步操作？
A: 使用 `async/await` 和 `expect().resolves`：

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Q: 如何 Mock API 调用？
A: 使用 `vi.mock()` 或 `vi.spyOn()`：

```typescript
vi.mock('@/services/api', () => ({
  default: {
    memories: {
      create: vi.fn().mockResolvedValue({ id: '123' }),
    },
  },
}))
```

### Q: 如何测试错误处理？
A: 使用 `expect().rejects`：

```typescript
it('should handle errors', async () => {
  await expect(failingFunction()).rejects.toThrow()
})
```

## 参考资源

- [Vitest 集成测试](https://vitest.dev/guide/features.html)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Supertest](https://github.com/visionmedia/supertest)
