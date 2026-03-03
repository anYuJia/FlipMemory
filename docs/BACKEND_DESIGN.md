# FlipMemory 后端设计文档

## 实施状态

### ✅ 已完成
- Prisma Schema 更新（用户资料字段、PIN加密字段）
- 用户模块 (`/api/user`) - 资料和设置的CRUD
- 记忆模块增强 - 搜索、最近记忆、纪念日记忆
- 前端 API 服务 (`services/api.ts`)
- 路由注册
- **前端 Store 与 API 对接**
  - `memory.ts` - 支持真实API和模拟数据双模式
  - `user.ts` - 用户认证、资料和设置管理
  - `ProfileSettingsView.vue` - 使用 userStore 管理数据

### ⏳ 待完成
- 运行 `npx prisma generate` 更新类型
- 运行 `npx prisma db push` 同步数据库
- 数据导出/清除模块
- 配置前端环境变量开启真实 API 模式

---

## 一、前端功能分析

### 1. 页面功能

| 页面 | 路由 | 功能描述 | API 需求 |
|------|------|----------|----------|
| 首页 | `/` | 展示今日问候、月度统计、精选记忆、最近记忆 | 获取月度统计、获取推荐记忆 |
| 日历 | `/calendar` | 月度日历视图，显示每日记忆状态 | 获取日历数据 |
| 记忆详情 | `/memory/:date` | 查看特定日期的记忆详情 | 获取单日记忆 |
| 创建记忆 | `/create` | 创建新记忆（文字、心情、照片） | 创建记忆、上传照片 |
| 记忆回顾 | `/flashback` | 随机翻阅历史记忆 | 获取随机记忆 |
| 统计 | `/stats` | 记忆数据统计分析 | 获取统计数据 |
| 搜索 | `/search` | 按关键词、心情搜索记忆 | 搜索记忆 |
| 设置 | `/settings` | 应用设置入口 | - |
| 主题设置 | `/settings/theme` | 主题外观设置 | 更新用户设置 |
| 周起始日 | `/settings/week-start` | 日历周起始日设置 | 更新用户设置 |
| 隐私锁 | `/settings/privacy-lock` | 应用锁设置 | 更新用户设置 |
| 数据管理 | `/settings/data` | 导出/清除数据 | 导出数据、清除数据 |
| 个人资料 | `/settings/profile` | 编辑用户资料 | 更新用户资料 |
| 登录/注册 | `/auth` | 用户认证 | 登录、注册 |

### 2. 数据模型

#### User (用户)
```typescript
{
  id: string
  email: string
  nickname: string | null
  avatar: string | null
  gender: 'male' | 'female' | 'other' | null
  birthday: string | null   // YYYY-MM-DD
  profession: string | null
  interests: string[]       // 兴趣爱好数组
  timezone: string
  createdAt: string
  updatedAt: string
}
```

#### UserSettings (用户设置)
```typescript
{
  reminderEnabled: boolean
  reminderTime: string      // HH:mm 格式
  reminderFrequency: 'daily' | 'weekly'
  appLockEnabled: boolean
  appLockType: 'pin' | 'biometric' | null
  appLockPin: string | null  // 加密存储
  theme: 'light' | 'dark' | 'system'
  startOfWeek: 0 | 1        // 0=周日, 1=周一
}
```

#### Memory (记忆)
```typescript
{
  id: string
  date: string              // YYYY-MM-DD
  content: string | null
  mood: MoodType | null
  isPrivate: boolean
  weather: string | null
  location: string | null
  photos: Photo[]
  tags: Tag[]
  createdAt: string
  updatedAt: string
}
```

#### Photo (照片)
```typescript
{
  id: string
  originalUrl: string
  thumbnailUrl: string
  mediumUrl: string
  takenAt: string | null
  width: number | null
  height: number | null
  order: number
}
```

## 二、API 设计

### 1. 认证模块 `/api/auth`

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/register` | 用户注册 | `{ email, password, nickname? }` | `{ user, accessToken }` |
| POST | `/login` | 用户登录 | `{ email, password }` | `{ user, accessToken }` |
| GET | `/me` | 获取当前用户 | - | `User` |
| POST | `/refresh` | 刷新 Token | `{ refreshToken }` | `{ accessToken }` |
| POST | `/logout` | 退出登录 | - | `{ success: true }` |

### 2. 用户模块 `/api/user`

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/profile` | 获取用户资料 | - | `UserProfile` |
| PUT | `/profile` | 更新用户资料 | `{ nickname?, avatar?, gender?, birthday?, profession?, interests? }` | `UserProfile` |
| GET | `/settings` | 获取用户设置 | - | `UserSettings` |
| PUT | `/settings` | 更新用户设置 | `Partial<UserSettings>` | `UserSettings` |
| POST | `/avatar` | 上传头像 | `FormData` | `{ avatarUrl }` |

### 3. 记忆模块 `/api/memories`

| 方法 | 路径 | 描述 | 请求体/参数 | 响应 |
|------|------|------|-------------|------|
| GET | `/calendar/:year/:month` | 获取月度日历 | - | `{ year, month, days: CalendarDay[] }` |
| GET | `/:date` | 获取单日记忆 | - | `Memory` |
| POST | `/` | 创建记忆 | `{ date, content?, mood?, photoKeys?, tags? }` | `Memory` |
| PUT | `/:date` | 更新记忆 | `{ content?, mood?, isPrivate?, tags? }` | `Memory` |
| DELETE | `/:date` | 删除记忆 | - | `{ deleted: true }` |
| GET | `/flashback` | 获取回顾记忆 | `?count=10` | `Memory[]` |
| GET | `/search` | 搜索记忆 | `?q=keyword&mood=happy&from=&to=` | `Memory[]` |
| GET | `/stats` | 获取统计数据 | `?year=&month=` | `Stats` |
| GET | `/recent` | 获取最近记忆 | `?limit=10` | `Memory[]` |
| GET | `/anniversary` | 获取纪念日记忆 | - | `Memory[]` |

### 4. 上传模块 `/api/upload`

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/presign` | 获取预签名 URL | `{ filename, mimeType }` | `{ uploadUrl, key }` |
| POST | `/confirm` | 确认上传完成 | `{ key }` | `{ photo: Photo }` |

### 5. 数据管理 `/api/data`

| 方法 | 路径 | 描述 | 响应 |
|------|------|------|------|
| GET | `/export` | 导出所有数据 | JSON 文件下载 |
| DELETE | `/all` | 清除所有数据 | `{ deleted: true }` |

## 三、需要新增/修改的后端模块

### 1. 用户模块 (新增)
- `src/modules/user/user.routes.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/user.schema.ts`

### 2. 数据库 Schema 更新
需要添加用户资料字段：
- gender
- birthday
- profession
- interests
- appLockPin (加密)

### 3. 搜索功能实现
需要实现全文搜索或模糊匹配

## 四、实施步骤

1. **更新 Prisma Schema** - 添加用户资料字段
2. **创建用户模块** - 资料和设置的 CRUD
3. **完善记忆模块** - 添加搜索、回顾、统计功能
4. **创建数据管理模块** - 导出和清除功能
5. **前端 API 服务** - 创建统一的 API 调用服务
6. **前端集成** - 将 Store 与 API 对接

## 五、响应格式

```typescript
// 成功响应
{
  code: 0,
  data: T,
  message?: string
}

// 错误响应
{
  code: number,  // 非 0
  message: string,
  errors?: any
}
```
