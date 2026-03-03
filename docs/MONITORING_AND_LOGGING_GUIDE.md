# 监控和日志指南

## 概述

FlipMemory 提供了完整的监控和日志系统，用于追踪应用性能、错误和用户行为。

## 日志系统

### 基本使用

```typescript
import { logger, LogLevel } from '@/services/logger'

// 调试日志
logger.debug('Debug message', 'ComponentName', { data: 'value' })

// 信息日志
logger.info('User logged in', 'AuthService', { userId: '123' })

// 警告日志
logger.warn('API response slow', 'ApiService', { duration: 5000 })

// 错误日志
logger.error('Failed to fetch data', 'DataService', error)
```

### 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| DEBUG | 开发调试 | 函数调用、变量值 |
| INFO | 重要信息 | 用户操作、API 调用 |
| WARN | 警告信息 | 性能问题、弃用 API |
| ERROR | 错误信息 | 异常、失败操作 |

### 日志管理

```typescript
// 设置最小日志级别
logger.setMinLevel(LogLevel.INFO)

// 获取所有日志
const allLogs = logger.getLogs()

// 获取指定级别的日志
const errors = logger.getLogsByLevel(LogLevel.ERROR)

// 获取指定上下文的日志
const apiLogs = logger.getLogsByContext('ApiService')

// 导出日志
const logExport = logger.export()

// 清除日志
logger.clear()

// 上报日志到服务器
await logger.reportToServer('/api/logs')
```

## 性能监控

### 初始化

```typescript
import { performanceMonitor } from '@/services/performanceMonitor'

// 在应用启动时初始化
performanceMonitor.init()
```

### Web Vitals 监控

自动监控以下指标：

- **LCP (Largest Contentful Paint)** - 最大内容绘制时间
- **FID (First Input Delay)** - 首次输入延迟
- **CLS (Cumulative Layout Shift)** - 累积布局偏移

### 自定义性能标记

```typescript
// 标记开始时间
performanceMonitor.mark('api-call-start')

// 执行操作
await fetchData()

// 标记结束时间
performanceMonitor.mark('api-call-end')

// 测量时间
const duration = performanceMonitor.measure(
  'API Call Duration',
  'api-call-start',
  'api-call-end'
)
```

### 记录 API 调用

```typescript
const startTime = performance.now()
const response = await api.memories.getCalendar(2024, 2)
const duration = performance.now() - startTime

performanceMonitor.recordApiCall('/memories/calendar/2024/2', duration)
```

### 获取性能指标

```typescript
// 获取所有指标
const metrics = performanceMonitor.getMetrics()

// 生成性能报告
const report = performanceMonitor.generateReport()

// 上报性能指标
await performanceMonitor.reportMetrics('/api/metrics')
```

## 集成到应用

### 在 main.ts 中初始化

```typescript
import { createApp } from 'vue'
import { logger, LogLevel } from '@/services/logger'
import { performanceMonitor } from '@/services/performanceMonitor'
import App from './App.vue'

const app = createApp(App)

// 初始化日志系统
logger.setMinLevel(
  import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO
)

// 初始化性能监控
performanceMonitor.init()

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  logger.error(`Vue error: ${info}`, 'Vue', err)
}

app.mount('#app')
```

### 在 API 服务中集成

```typescript
import { logger } from '@/services/logger'
import { performanceMonitor } from '@/services/performanceMonitor'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const startTime = performance.now()

  try {
    logger.debug(`API request: ${endpoint}`, 'ApiService')

    const response = await fetch(url, options)
    const duration = performance.now() - startTime

    performanceMonitor.recordApiCall(endpoint, duration)

    if (!response.ok) {
      logger.warn(`API error: ${endpoint} - ${response.status}`, 'ApiService')
    }

    return await response.json()
  } catch (error) {
    logger.error(`API request failed: ${endpoint}`, 'ApiService', error)
    throw error
  }
}
```

### 在组件中集成

```typescript
import { logger } from '@/services/logger'

export default {
  name: 'MyComponent',
  async mounted() {
    logger.debug('Component mounted', 'MyComponent')

    try {
      const data = await fetchData()
      logger.info('Data loaded successfully', 'MyComponent')
    } catch (error) {
      logger.error('Failed to load data', 'MyComponent', error)
    }
  },
}
```

## 监控仪表板

### 创建监控页面

```vue
<template>
  <div class="monitoring-dashboard">
    <div class="metrics">
      <div class="metric">
        <h3>LCP</h3>
        <p>{{ metrics.lcp }}ms</p>
      </div>
      <div class="metric">
        <h3>FID</h3>
        <p>{{ metrics.fid }}ms</p>
      </div>
      <div class="metric">
        <h3>CLS</h3>
        <p>{{ metrics.cls }}</p>
      </div>
      <div class="metric">
        <h3>Memory</h3>
        <p>{{ metrics.memoryUsage }}MB</p>
      </div>
    </div>

    <div class="logs">
      <h3>Recent Logs</h3>
      <div v-for="log in recentLogs" :key="log.timestamp" class="log-entry">
        <span class="level" :class="log.level.toLowerCase()">{{ log.level }}</span>
        <span class="message">{{ log.message }}</span>
        <span class="time">{{ formatTime(log.timestamp) }}</span>
      </div>
    </div>

    <div class="actions">
      <button @click="exportLogs">导出日志</button>
      <button @click="reportMetrics">上报指标</button>
      <button @click="clearLogs">清除日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { logger } from '@/services/logger'
import { performanceMonitor } from '@/services/performanceMonitor'

const metrics = ref({})
const recentLogs = ref([])

onMounted(() => {
  metrics.value = performanceMonitor.getMetrics()
  recentLogs.value = logger.getLogs().slice(-10)
})

const exportLogs = () => {
  const data = logger.export()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${Date.now()}.json`
  a.click()
}

const reportMetrics = async () => {
  await performanceMonitor.reportMetrics('/api/metrics')
}

const clearLogs = () => {
  logger.clear()
  recentLogs.value = []
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.monitoring-dashboard {
  padding: 20px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.metric {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.metric h3 {
  margin: 0 0 10px 0;
  color: #666;
}

.metric p {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.logs {
  margin-bottom: 30px;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #eee;
  font-family: monospace;
  font-size: 12px;
}

.level {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  min-width: 60px;
}

.level.debug {
  background: #e3f2fd;
  color: #1976d2;
}

.level.info {
  background: #e8f5e9;
  color: #388e3c;
}

.level.warn {
  background: #fff3e0;
  color: #f57c00;
}

.level.error {
  background: #ffebee;
  color: #d32f2f;
}

.message {
  flex: 1;
}

.time {
  color: #999;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #5568d3;
}
</style>
```

## 最佳实践

1. **使用适当的日志级别** - 不要过度使用 DEBUG
2. **包含上下文信息** - 总是提供组件或服务名称
3. **避免记录敏感信息** - 不要记录密码、token 等
4. **定期清理日志** - 防止 localStorage 溢出
5. **监控关键操作** - 标记重要的性能时间点
6. **定期上报指标** - 收集生产环境的性能数据

## 常见问题

### Q: 日志会占用多少存储空间？
A: 默认最多保存 1000 条日志，约占 1-2MB localStorage。

### Q: 如何在生产环境中禁用 DEBUG 日志？
A: 在 main.ts 中设置：
```typescript
logger.setMinLevel(LogLevel.INFO)
```

### Q: 如何导出日志进行分析？
A: 使用 `logger.export()` 或监控仪表板的导出功能。

## 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Console API](https://developer.mozilla.org/en-US/docs/Web/API/console)
