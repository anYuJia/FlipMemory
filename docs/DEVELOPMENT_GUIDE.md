# FlipMemory（翻转记忆）开发文档

> 一个基于翻转卡片交互的照片日记应用，帮助用户记录和回顾生活中的美好瞬间。

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术栈选型](#技术栈选型)
3. [系统架构](#系统架构)
4. [功能模块](#功能模块)
5. [数据模型](#数据模型)
6. [API 设计](#api-设计)
7. [开发规范](#开发规范)
8. [部署指南](#部署指南)

---

## 项目概述

### 产品愿景

FlipMemory 是一款专注于**照片日记**的记忆管理应用。通过独特的**翻转卡片**交互设计，让用户在记录与回顾中获得仪式感与情感共鸣。

### 核心价值

- 🎴 **翻转交互** - 正面照片，背面故事，翻转即回忆
- 📅 **日历管理** - 按日期组织记忆，一目了然
- 🎭 **情绪记录** - 用 Emoji 标记心情，回顾情感轨迹
- 🔄 **记忆回顾** - 自动推送历史记忆，连接过去与现在

---

## 技术栈选型

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.4 | 渐进式 JavaScript 框架 |
| Vite | ^5.0 | 下一代前端构建工具 |
| TypeScript | ^5.3 | 类型安全的 JavaScript 超集 |
| Pinia | ^2.1 | Vue 3 官方推荐状态管理 |
| Tailwind CSS | ^3.4 | 原子化 CSS 框架 |
| Lucide Icons | ^0.300 | 精美图标库 |
| VueUse | ^10.7 | Vue 组合式 API 工具集 |

### 跨平台方案

| 技术 | 用途 |
|------|------|
| Capacitor | Web → iOS/Android 跨平台打包 |
| PWA | 渐进式 Web 应用，支持离线访问 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ^20 LTS | 运行时环境 |
| Fastify | ^4.25 | 高性能 Web 框架 |
| TypeScript | ^5.3 | 类型安全 |
| Prisma | ^5.7 | 现代 ORM |
| PostgreSQL | ^16 | 关系型数据库 |
| Redis | ^7 | 缓存层 |

### 对象存储

| 技术 | 用途 |
|------|------|
| MinIO | S3 兼容的对象存储 |
| Sharp | 图片处理（压缩、缩略图、WebP 转换） |

### 核心机制：S3 Presigned URL 直传

```
┌─────────┐     1. 请求上传凭证      ┌─────────┐
│  前端   │ ──────────────────────→ │  后端   │
│         │ ←────────────────────── │         │
└────┬────┘   2. 返回 Presigned URL └────┬────┘
     │                                    │
     │  3. 直接上传图片                    │
     │ ─────────────────────→ ┌──────────┴─┐
     │                        │   MinIO    │
     │ ←───────────────────── │            │
     │  4. 上传成功响应        └────────────┘
     │
     │  5. 提交记忆元信息
     │ ──────────────────────→ 后端存储元数据
```

**优势：**
- 降低服务器带宽压力
- 提升上传速度
- 支持大文件断点续传

---

## 系统架构

### 整体架构图

```
┌────────────────────────────────────────────────────────────────┐
│                        客户端层                                 │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│   Web PWA   │   iOS App   │  Android App │   桌面端 (未来)   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬─────────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        API 网关层                               │
│              (Nginx / CloudFlare / API Gateway)                │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                        应用服务层                               │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Auth 模块   │  │ Memory 模块 │  │ Notification 模块       │ │
│  │ - 注册登录  │  │ - 记忆 CRUD │  │ - 推送提醒              │ │
│  │ - JWT 鉴权  │  │ - 日历查询  │  │ - 回顾推荐              │ │
│  └─────────────┘  │ - 情绪标签  │  └─────────────────────────┘ │
│                   │ - 搜索筛选  │                              │
│  ┌─────────────┐  └─────────────┘  ┌─────────────────────────┐ │
│  │ Upload 模块 │                   │ Stats 模块              │ │
│  │ - Presigned │  ┌─────────────┐  │ - 数据统计              │ │
│  │ - 图片处理  │  │ Share 模块  │  │ - 情绪分析              │ │
│  └─────────────┘  │ - 卡片分享  │  └─────────────────────────┘ │
│                   └─────────────┘                              │
└───────────────────────────┬────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │     Redis       │ │     MinIO       │
│   (主数据库)    │ │   (缓存层)      │ │   (对象存储)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 前端架构

```
src/
├── assets/                 # 静态资源
│   ├── images/
│   └── styles/
│       └── main.css       # Tailwind 入口
├── components/            # 通用组件
│   ├── ui/               # 基础 UI 组件
│   │   ├── Button.vue
│   │   ├── Card.vue
│   │   ├── Modal.vue
│   │   └── ...
│   ├── calendar/         # 日历相关组件
│   │   ├── CalendarGrid.vue
│   │   ├── DayCell.vue
│   │   └── MonthNavigator.vue
│   ├── memory/           # 记忆相关组件
│   │   ├── FlipCard.vue
│   │   ├── MemoryForm.vue
│   │   ├── PhotoUploader.vue
│   │   └── EmojiPicker.vue
│   └── layout/           # 布局组件
│       ├── AppHeader.vue
│       ├── AppNav.vue
│       └── AppFooter.vue
├── composables/          # 组合式函数
│   ├── useMemory.ts
│   ├── useCalendar.ts
│   ├── useUpload.ts
│   └── useAuth.ts
├── stores/               # Pinia 状态管理
│   ├── memory.ts
│   ├── user.ts
│   └── ui.ts
├── views/                # 页面视图
│   ├── HomeView.vue
│   ├── CalendarView.vue
│   ├── MemoryDetailView.vue
│   ├── FlashbackView.vue
│   ├── StatsView.vue
│   └── SettingsView.vue
├── router/               # 路由配置
│   └── index.ts
├── services/             # API 服务
│   ├── api.ts
│   ├── memory.ts
│   ├── upload.ts
│   └── auth.ts
├── types/                # TypeScript 类型定义
│   ├── memory.ts
│   ├── user.ts
│   └── api.ts
├── utils/                # 工具函数
│   ├── date.ts
│   ├── image.ts
│   └── storage.ts
├── App.vue
└── main.ts
```

### 后端架构

```
server/
├── src/
│   ├── modules/              # 功能模块
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.routes.ts
│   │   ├── memory/
│   │   │   ├── memory.controller.ts
│   │   │   ├── memory.service.ts
│   │   │   ├── memory.schema.ts
│   │   │   └── memory.routes.ts
│   │   ├── upload/
│   │   │   ├── upload.controller.ts
│   │   │   ├── upload.service.ts
│   │   │   └── upload.routes.ts
│   │   └── notification/
│   │       ├── notification.service.ts
│   │       └── notification.scheduler.ts
│   ├── shared/               # 共享模块
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── rate-limit.middleware.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── response.ts
│   │   │   └── validator.ts
│   │   └── config/
│   │       ├── database.ts
│   │       ├── minio.ts
│   │       └── redis.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

---

## 功能模块

### 1. 日历式记忆管理

#### 功能描述
- 按月浏览记忆记录
- 已记录日期高亮展示（带缩略图预览）
- 快速定位历史月份
- 支持周视图切换

#### 交互细节
```
┌────────────────────────────────────────┐
│  ◄ 2024年12月 ►                   [周] │
├────┬────┬────┬────┬────┬────┬────────┤
│ 日 │ 一 │ 二 │ 三 │ 四 │ 五 │   六   │
├────┼────┼────┼────┼────┼────┼────────┤
│  1 │  2 │ 3● │  4 │ 5● │  6 │   7    │
│    │    │ 🌅 │    │ 🎂 │    │        │
├────┼────┼────┼────┼────┼────┼────────┤
│  8 │  9 │ 10 │ 11 │12● │ 13 │  14●   │
│    │    │    │    │ 📸 │    │  🏃    │
└────┴────┴────┴────┴────┴────┴────────┘

● = 已记录日期（显示缩略图或情绪 emoji）
```

### 2. 照片记忆记录

#### 功能描述
- 每个日期可记录**多张照片**（优化：原需求为单张）
- 支持拍照或从相册选择
- 为照片添加文字描述
- 支持编辑和删除

#### 图片处理流程
```
原图上传 → 生成缩略图(200x200) → 转换 WebP → 存储 MinIO
                ↓
         生成中图(800x800)
                ↓
         保留原图(压缩后)
```

### 3. 翻转卡片交互

#### 功能描述
- 正面：照片 + 日期 + 情绪标签
- 背面：文字内容 + 时间戳
- 点击/触摸翻转
- 支持手势左右滑动切换

#### 视觉设计
```
┌─────────────────────────┐     ┌─────────────────────────┐
│                         │     │                         │
│     ┌───────────────┐   │     │   "今天和朋友们一起     │
│     │               │   │     │    去了海边，阳光       │
│     │    📷 照片    │   │ ←→  │    很好，心情也很       │
│     │               │   │     │    不错..."             │
│     └───────────────┘   │     │                         │
│                         │     │   ───────────────────   │
│  12月18日 周三    😊    │     │   拍摄于 14:32          │
│                         │     │                         │
└─────────────────────────┘     └─────────────────────────┘
       [ 正面 ]                        [ 背面 ]
```

### 4. 情绪标签记录

#### 支持的情绪类型
| Emoji | 含义 | 颜色标识 |
|-------|------|----------|
| 😊 | 开心 | #FFD93D |
| 😢 | 难过 | #6C9BCF |
| 😡 | 生气 | #FF6B6B |
| 😌 | 平静 | #95E1D3 |
| 🤩 | 兴奋 | #FF8C00 |
| 😴 | 疲惫 | #B4B4B4 |
| 🥰 | 幸福 | #FF69B4 |
| 🤔 | 思考 | #DDA0DD |

#### 情绪统计（优化新增）
- 月度情绪分布饼图
- 情绪趋势折线图
- 按情绪筛选记忆

### 5. 记忆回顾模式

#### 回顾类型
1. **一年前的今天** - 时光倒流
2. **随机回顾** - 惊喜发现
3. **本周回顾** - 近期回忆
4. **情绪回顾** - 按心情找记忆

#### 展示方式
- 全屏卡片轮播
- 自动播放模式
- 背景音乐支持（可选）

### 6. 最近记忆快捷查看

#### 入口设计
```
┌─────────────────────────────────────────┐
│  最近记忆                               │
├─────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │ 📷  │  │ 📷  │  │ 📷  │  │ +2  │ →  │
│  │ 今天 │  │ 昨天 │  │ 前天 │  │     │    │
│  └─────┘  └─────┘  └─────┘  └─────┘    │
└─────────────────────────────────────────┘
```

### 7. 自动时间信息记录

- 自动读取照片 EXIF 信息
- 提取拍摄时间、地点（如有）
- GPS 坐标逆地理编码（优化新增）
- 天气信息自动关联（优化新增）

### 8. 温和型记录提醒

#### 提醒策略
| 未记录天数 | 提醒文案示例 |
|------------|--------------|
| 3 天 | "嗨，最近有什么值得记录的瞬间吗？" |
| 7 天 | "一周没见啦，生活中的小美好等着被记住呢" |
| 14 天 | "时光飞逝，愿你一切都好 ☺️" |
| 30 天 | "好久不见，如果想倾诉，我一直在这里" |

#### 设置选项
- 提醒开关
- 提醒时间（默认晚上 9 点）
- 提醒频率（每天/每周）

### 9. 数据安全与隐私（优化新增）

#### 隐私模式
- 敏感记忆加密存储
- 应用锁（指纹/面容/密码）
- 记忆隐藏（需二次验证查看）

#### 数据导出
- 导出为 ZIP（照片 + JSON 元数据）
- 导出为 PDF 相册
- 支持增量备份

### 10. 搜索与筛选（优化新增）

#### 搜索维度
- 文字内容搜索
- 日期范围筛选
- 情绪标签筛选
- 地点筛选（如有）

### 11. 分享功能（优化新增）

#### 分享卡片生成
```
┌─────────────────────────────────────┐
│                                     │
│        ╭───────────────────╮        │
│        │                   │        │
│        │      📷 照片      │        │
│        │                   │        │
│        ╰───────────────────╯        │
│                                     │
│   "今天是特别的一天..."              │
│                                     │
│   ───────────────────────────────   │
│   📅 2024.12.18    😊 开心          │
│              FlipMemory             │
└─────────────────────────────────────┘
```

---

## 数据模型

### 数据库 Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  nickname      String?
  avatar        String?
  timezone      String    @default("Asia/Shanghai")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  memories      Memory[]
  settings      UserSettings?
  
  @@map("users")
}

model UserSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 提醒设置
  reminderEnabled       Boolean  @default(true)
  reminderTime          String   @default("21:00")
  reminderFrequency     String   @default("daily") // daily, weekly
  
  // 隐私设置
  appLockEnabled        Boolean  @default(false)
  appLockType           String?  // pin, biometric
  
  // 显示设置
  theme                 String   @default("system") // light, dark, system
  startOfWeek           Int      @default(0)        // 0 = Sunday, 1 = Monday
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@map("user_settings")
}

model Memory {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  date          DateTime  @db.Date  // 记忆日期（不含时间）
  content       String?   @db.Text  // 文字内容
  mood          String?             // 情绪标签
  isPrivate     Boolean   @default(false)  // 隐私记忆
  
  // 自动记录信息
  weather       String?             // 天气
  location      String?             // 地点名称
  latitude      Float?              // 纬度
  longitude     Float?              // 经度
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  photos        Photo[]
  tags          MemoryTag[]
  
  @@unique([userId, date])
  @@index([userId, date])
  @@index([userId, mood])
  @@map("memories")
}

model Photo {
  id            String    @id @default(cuid())
  memoryId      String
  memory        Memory    @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  
  // 存储路径
  originalUrl   String              // 原图
  thumbnailUrl  String              // 缩略图
  mediumUrl     String              // 中等尺寸
  
  // EXIF 信息
  takenAt       DateTime?           // 拍摄时间
  width         Int?
  height        Int?
  
  order         Int       @default(0)  // 排序
  createdAt     DateTime  @default(now())
  
  @@index([memoryId])
  @@map("photos")
}

model Tag {
  id            String    @id @default(cuid())
  name          String    @unique
  color         String?
  
  memories      MemoryTag[]
  
  @@map("tags")
}

model MemoryTag {
  memoryId      String
  tagId         String
  memory        Memory    @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  tag           Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([memoryId, tagId])
  @@map("memory_tags")
}
```

### TypeScript 类型定义

```typescript
// types/memory.ts

export interface Memory {
  id: string
  date: string           // YYYY-MM-DD
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

export interface Photo {
  id: string
  originalUrl: string
  thumbnailUrl: string
  mediumUrl: string
  takenAt: string | null
  width: number | null
  height: number | null
  order: number
}

export interface Tag {
  id: string
  name: string
  color: string | null
}

export type MoodType = 
  | 'happy'     // 😊
  | 'sad'       // 😢
  | 'angry'     // 😡
  | 'calm'      // 😌
  | 'excited'   // 🤩
  | 'tired'     // 😴
  | 'loved'     // 🥰
  | 'thinking'  // 🤔

export const MoodEmoji: Record<MoodType, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😡',
  calm: '😌',
  excited: '🤩',
  tired: '😴',
  loved: '🥰',
  thinking: '🤔',
}
```

---

## API 设计

### RESTful API 端点

#### 认证模块

```
POST   /api/auth/register      # 注册
POST   /api/auth/login         # 登录
POST   /api/auth/refresh       # 刷新 Token
POST   /api/auth/logout        # 登出
GET    /api/auth/me            # 获取当前用户信息
```

#### 记忆模块

```
GET    /api/memories                    # 获取记忆列表（分页）
GET    /api/memories/:date              # 获取指定日期记忆
POST   /api/memories                    # 创建记忆
PUT    /api/memories/:id                # 更新记忆
DELETE /api/memories/:id                # 删除记忆

GET    /api/memories/calendar/:year/:month  # 获取月度日历数据
GET    /api/memories/flashback              # 获取回顾记忆
GET    /api/memories/search                 # 搜索记忆
GET    /api/memories/stats                  # 获取统计数据
```

#### 上传模块

```
POST   /api/upload/presign             # 获取预签名 URL
POST   /api/upload/complete            # 上传完成确认
DELETE /api/upload/:photoId            # 删除照片
```

#### 用户设置

```
GET    /api/settings                   # 获取用户设置
PUT    /api/settings                   # 更新用户设置
POST   /api/settings/export            # 导出数据
```

### API 请求/响应示例

#### 获取月度日历数据

**Request:**
```http
GET /api/memories/calendar/2024/12
Authorization: Bearer <token>
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "year": 2024,
    "month": 12,
    "days": [
      {
        "date": "2024-12-03",
        "hasMemory": true,
        "mood": "happy",
        "thumbnailUrl": "https://..."
      },
      {
        "date": "2024-12-05",
        "hasMemory": true,
        "mood": "excited",
        "thumbnailUrl": "https://..."
      }
    ]
  }
}
```

#### 创建记忆

**Request:**
```http
POST /api/memories
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-12-18",
  "content": "今天天气很好，和朋友去了公园...",
  "mood": "happy",
  "photos": [
    {
      "key": "uploads/2024/12/18/abc123.webp",
      "takenAt": "2024-12-18T14:32:00Z"
    }
  ],
  "tags": ["朋友", "户外"]
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "id": "clq1234567890",
    "date": "2024-12-18",
    "content": "今天天气很好，和朋友去了公园...",
    "mood": "happy",
    "photos": [...],
    "createdAt": "2024-12-18T06:54:00Z"
  }
}
```

---

## 开发规范

### Git 分支策略

```
main          # 生产环境
├── develop   # 开发环境
│   ├── feature/calendar-view
│   ├── feature/flip-card
│   └── feature/emotion-tag
├── hotfix/xxx
└── release/v1.0.0
```

### 提交规范

```
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/工具相关
```

### 代码规范

- ESLint + Prettier 统一代码风格
- Husky + lint-staged 提交前检查
- TypeScript 严格模式

### 测试策略

```
单元测试:     Vitest (前端) / Jest (后端)
组件测试:     Vue Test Utils
E2E 测试:     Playwright
API 测试:     Supertest
```

---

## 部署指南

### 开发环境

```bash
# 克隆仓库
git clone <repo-url>
cd FlipMemory

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### Docker 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./server
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/flipmemory
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=flipmemory

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 移动端打包

```bash
# iOS
npx cap add ios
npx cap sync ios
npx cap open ios

# Android
npx cap add android
npx cap sync android
npx cap open android
```

---

## 项目里程碑

### Phase 1 - MVP（4 周）

- [ ] 项目初始化与基础架构
- [ ] 用户认证系统
- [ ] 日历视图与基础交互
- [ ] 单张照片记忆功能
- [ ] 翻转卡片组件

### Phase 2 - 核心功能（3 周）

- [ ] 多图支持
- [ ] 情绪标签系统
- [ ] 记忆回顾功能
- [ ] 搜索与筛选

### Phase 3 - 体验优化（2 周）

- [ ] PWA 支持
- [ ] 深色模式
- [ ] 手势交互优化
- [ ] 性能优化

### Phase 4 - 高级功能（3 周）

- [ ] 隐私模式
- [ ] 数据导出
- [ ] 分享功能
- [ ] 推送提醒

### Phase 5 - 移动端（2 周）

- [ ] Capacitor 集成
- [ ] iOS 适配
- [ ] Android 适配

---

## 附录

### 参考资源

- [Vue 3 文档](https://vuejs.org/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Capacitor 文档](https://capacitorjs.com/)
- [MinIO 文档](https://min.io/docs/)
- [Prisma 文档](https://www.prisma.io/docs)

### 设计参考

- 日记类 App：Day One, Journey, Momento
- 照片管理：Google Photos, Apple Photos
- 卡片交互：Tinder, Bumble (滑动), Anki (翻转)

---

*文档最后更新: 2024-12-18*
</CodeContent>
<parameter name="EmptyFile">false
