# Vitest 测试指南

## 快速开始

### 安装依赖

```bash
cd frontend
npm install
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 监听模式（开发时使用）
npm run test -- --watch

# 生成覆盖率报告
npm run test:coverage

# 打开测试 UI
npm run test:ui
```

## 测试文件结构

```
src/
├── utils/
│   ├── dateFormatter.ts
│   └── __tests__/
│       └── dateFormatter.test.ts
├── services/
│   ├── api.ts
│   └── __tests__/
│       └── api.test.ts
└── composables/
    ├── useRetry.ts
    └── __tests__/
        └── useRetry.test.ts
```

## 编写测试

### 基础测试

```typescript
import { describe, it, expect } from 'vitest'

describe('功能名称', () => {
  it('应该做什么', () => {
    const result = someFunction()
    expect(result).toBe(expectedValue)
  })
})
```

### 异步测试

```typescript
it('应该处理异步操作', async () => {
  const result = await asyncFunction()
  expect(result).toBe(expectedValue)
})
```

### Mock 和 Spy

```typescript
import { vi } from 'vitest'

it('应该调用函数', () => {
  const mockFn = vi.fn()
  mockFn('arg')
  expect(mockFn).toHaveBeenCalledWith('arg')
})
```

### 测试生命周期

```typescript
import { beforeEach, afterEach } from 'vitest'

describe('测试套件', () => {
  beforeEach(() => {
    // 每个测试前执行
  })

  afterEach(() => {
    // 每个测试后执行
  })
})
```

## 测试覆盖率目标

| 类型 | 目标 |
|------|------|
| 行覆盖率 | 50%+ |
| 函数覆盖率 | 50%+ |
| 分支覆盖率 | 50%+ |
| 语句覆盖率 | 50%+ |

## 现有测试

### 工具函数测试
- ✅ `dateFormatter.test.ts` - 日期格式化
- ✅ `errorHandler.test.ts` - 错误处理
- ✅ `urlBuilder.test.ts` - URL 构建

### 服务测试
- ✅ `conflictResolver.test.ts` - 冲突解决
- ✅ `tokenManager.test.ts` - Token 管理
- ✅ `encryptionService.test.ts` - 加密服务
- ✅ `offlineApi.test.ts` - 离线 API

### Composables 测试
- ✅ `useRetry.test.ts` - 重试机制

## 待添加的测试

### 组件测试
- [ ] `ErrorBoundary.vue` - 错误边界
- [ ] `ErrorToast.vue` - 错误提示
- [ ] `SkeletonLoader.vue` - 骨架屏
- [ ] `ProgressBar.vue` - 进度条

### Composables 测试
- [ ] `useErrorHandler.ts` - 错误处理
- [ ] `useLazyImage.ts` - 图片懒加载
- [ ] `useResponsive.ts` - 响应式设计

### 集成测试
- [ ] 离线功能流程
- [ ] 冲突检测和解决
- [ ] 认证流程

## 最佳实践

### 1. 测试命名
```typescript
// ✅ 好
it('should return formatted date string in YYYY-MM-DD format', () => {})

// ❌ 不好
it('test date format', () => {})
```

### 2. 单一职责
```typescript
// ✅ 好 - 每个测试只测试一个功能
it('should return null for expired token', () => {})
it('should return token for valid token', () => {})

// ❌ 不好 - 测试多个功能
it('should handle token correctly', () => {})
```

### 3. 使用 beforeEach 清理状态
```typescript
beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})
```

### 4. Mock 外部依赖
```typescript
vi.mock('@/services/api', () => ({
  default: {
    memories: {
      getCalendar: vi.fn(),
    },
  },
}))
```

## 调试测试

### 运行单个测试文件
```bash
npm run test -- dateFormatter.test.ts
```

### 运行匹配模式的测试
```bash
npm run test -- --grep "should format date"
```

### 调试模式
```bash
npm run test -- --inspect-brk
```

## CI/CD 集成

测试已集成到 GitHub Actions CI/CD 流程中：

```yaml
- name: Run tests
  run: npm run test
```

## 常见问题

### Q: 如何测试 Vue 组件？
A: 使用 `@vue/test-utils` 和 `happy-dom`：

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

it('should render component', () => {
  const wrapper = mount(MyComponent)
  expect(wrapper.exists()).toBe(true)
})
```

### Q: 如何 Mock Pinia Store？
A: 使用 `vi.mock()`：

```typescript
vi.mock('@/stores/memory', () => ({
  useMemoryStore: () => ({
    memories: [],
    addMemory: vi.fn(),
  }),
}))
```

### Q: 如何测试异步函数？
A: 使用 `async/await`：

```typescript
it('should fetch data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})
```

## 参考资源

- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Testing Library 最佳实践](https://testing-library.com/docs/queries/about)
