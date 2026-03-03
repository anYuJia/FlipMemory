# FlipMemory 快速参考卡

## 🚀 快速开始

### 安装和运行
```bash
# 前端
cd frontend
npm install
npm run dev

# 后端
cd ../server
npm install
npm run dev
```

### 运行测试
```bash
npm run test              # 运行所有测试
npm run test:coverage    # 生成覆盖率报告
npm run test:ui          # 打开测试 UI
```

---

## 📚 核心服务

### 日志系统
```typescript
import { logger } from '@/services/logger'

logger.debug('Debug message', 'Context')
logger.info('Info message', 'Context', { data })
logger.warn('Warning message', 'Context')
logger.error('Error message', 'Context', error)
```

### 性能监控
```typescript
import { performanceMonitor } from '@/services/performanceMonitor'

performanceMonitor.init()
performanceMonitor.mark('start')
// ... 操作
performanceMonitor.measure('Operation', 'start')
```

### 离线 API
```typescript
import { offlineApi } from '@/services/offlineApi'

const memory = await offlineApi.memories.create({
  date: '2024-02-09',
  content: 'Test',
  mood: 'happy',
})
```

### Token 管理
```typescript
import { getToken, saveToken, isAuthenticated } from '@/services/tokenManager'

saveToken(token, 3600)
const token = getToken()
if (isAuthenticated()) { /* ... */ }
```

### 数据加密
```typescript
import { encryptText, decryptText, generateEncryptionKey } from '@/services/encryptionService'

const key = await generateEncryptionKey('password')
const encrypted = await encryptText('data', key)
const decrypted = await decryptText(encrypted, key)
```

---

## 🛠️ 工具函数

### 日期格式化
```typescript
import { formatDateToString, formatRelativeTime } from '@/utils/dateFormatter'

formatDateToString(new Date())        // "2024-02-09"
formatRelativeTime(new Date())        // "刚刚"
```

### 错误处理
```typescript
import { AppError, getUserFriendlyMessage } from '@/utils/errorHandler'

const error = new AppError('Message', 500)
const message = getUserFriendlyMessage(error)
```

### URL 构建
```typescript
import { buildApiUrl, buildPhotoUrl } from '@/utils/urlBuilder'

buildApiUrl('/memories')              // "http://localhost:3001/api/memories"
buildPhotoUrl('photo.jpg', 'medium')  // "...?size=medium"
```

---

## 📖 文档

| 文档 | 位置 | 用途 |
|------|------|------|
| 开发指南 | `docs/DEVELOPMENT_GUIDE.md` | 项目概述和架构 |
| 测试指南 | `docs/TESTING_GUIDE.md` | 单元测试编写 |
| 集成测试 | `docs/INTEGRATION_TESTING_GUIDE.md` | 集成测试编写 |
| 监控日志 | `docs/MONITORING_AND_LOGGING_GUIDE.md` | 监控和日志使用 |
| 优化总结 | `docs/OPTIMIZATION_SUMMARY.md` | 优化工作总结 |
| 下一步 | `docs/NEXT_PHASE_SUMMARY.md` | 下一步优化计划 |

---

## 🎯 常见任务

### 添加新的单元测试
```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction()
    expect(result).toBe(expectedValue)
  })
})
```

### 添加新的 Composable
```typescript
import { ref, onMounted } from 'vue'

export function useMyComposable() {
  const state = ref(null)

  onMounted(() => {
    // 初始化
  })

  return { state }
}
```

### 添加新的 API 端点
```typescript
export const api = {
  myModule: {
    getItem: (id: string) =>
      request<Item>(`/my-module/${id}`),
  },
}
```

---

## 🔍 调试技巧

### 查看日志
```typescript
// 获取所有日志
const logs = logger.getLogs()

// 获取特定级别的日志
const errors = logger.getLogsByLevel(LogLevel.ERROR)

// 导出日志
const exported = logger.export()
```

### 查看性能指标
```typescript
// 获取所有指标
const metrics = performanceMonitor.getMetrics()

// 生成报告
const report = performanceMonitor.generateReport()
```

### 浏览器控制台
```javascript
// 查看 localStorage 中的日志
JSON.parse(localStorage.getItem('app_logs'))

// 查看性能指标
performance.getEntriesByType('navigation')
```

---

## 📊 项目结构

```
frontend/
├── src/
│   ├── components/      # Vue 组件
│   ├── views/          # 页面视图
│   ├── stores/         # Pinia 状态管理
│   ├── services/       # API 和业务服务
│   ├── composables/    # 组合式函数
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型
│   └── router/         # 路由配置
├── vitest.config.ts    # Vitest 配置
└── package.json

server/
├── src/
│   ├── modules/        # 功能模块
│   ├── shared/         # 共享代码
│   └── prisma/         # 数据库配置
└── package.json
```

---

## 🚨 常见问题

### Q: 如何运行特定的测试？
```bash
npm run test -- dateFormatter.test.ts
npm run test -- --grep "should format"
```

### Q: 如何查看测试覆盖率？
```bash
npm run test:coverage
# 打开 coverage/index.html
```

### Q: 如何添加新的日志级别？
```typescript
// 在 logger.ts 中修改 LogLevel 枚举
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  // 添加新级别
}
```

### Q: 如何禁用某个日志级别？
```typescript
logger.setMinLevel(LogLevel.WARN)  // 只显示 WARN 和 ERROR
```

---

## 🔗 有用的链接

- [Vue 3 文档](https://vuejs.org/)
- [Vitest 文档](https://vitest.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 获取帮助

- 查看相关文档
- 查看测试示例
- 查看现有代码
- 查看 GitHub Issues

---

*最后更新: 2024-02-09*
