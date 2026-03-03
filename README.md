# 🎴 FlipMemory

> 翻转记忆 —— 用翻转卡片的方式，记录生活中的美好瞬间

<div align="center">

![FlipMemory Banner](./docs/assets/banner.png)

[![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

</div>

---

## ✨ 特性

- 🎴 **翻转卡片** - 正面照片，背面故事，翻转即回忆
- 📅 **日历管理** - 按日期组织记忆，一目了然
- 🎭 **情绪记录** - 用 Emoji 标记心情，回顾情感轨迹
- 🔄 **记忆回顾** - 自动推送「一年前的今天」
- 📱 **多端同步** - Web / iOS / Android 数据一致
- 🔒 **隐私保护** - 敏感记忆加密，应用锁保护

---

## 🖼️ 预览

<div align="center">
<table>
<tr>
<td align="center"><strong>日历视图</strong></td>
<td align="center"><strong>翻转卡片</strong></td>
<td align="center"><strong>记忆回顾</strong></td>
</tr>
<tr>
<td><img src="./docs/assets/calendar.png" width="250"/></td>
<td><img src="./docs/assets/flip-card.png" width="250"/></td>
<td><img src="./docs/assets/flashback.png" width="250"/></td>
</tr>
</table>
</div>

---

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 8
- Docker & Docker Compose（可选）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/FlipMemory.git
cd FlipMemory

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### Docker 部署

```bash
# 一键启动所有服务
docker-compose up -d
```

---

## 📁 项目结构

```
FlipMemory/
├── frontend/              # Vue 3 前端
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── views/        # 页面
│   │   ├── stores/       # Pinia 状态
│   │   └── services/     # API 服务
│   └── ...
├── server/                # Node.js 后端
│   ├── src/
│   │   ├── modules/      # 功能模块
│   │   ├── shared/       # 共享代码
│   │   └── prisma/       # 数据库
│   └── ...
├── docs/                  # 文档
│   └── DEVELOPMENT_GUIDE.md
└── docker-compose.yml
```

---

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS
- **状态**: Pinia
- **图标**: Lucide Icons
- **跨平台**: Capacitor

### 后端
- **运行时**: Node.js
- **框架**: Fastify
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **缓存**: Redis
- **存储**: MinIO (S3 兼容)

---

## 📖 文档

- [📓 开发指南](./docs/DEVELOPMENT_GUIDE.md) - 完整的技术文档
- [🎨 设计规范](./docs/DESIGN_SPEC.md) - UI/UX 设计规范
- [🔌 API 文档](./docs/API.md) - 接口文档

---

## 🗺️ 路线图

- [x] 项目文档
- [ ] 前端基础框架
- [ ] 用户认证系统
- [ ] 日历视图
- [ ] 翻转卡片组件
- [ ] 照片上传功能
- [ ] 情绪标签系统
- [ ] 记忆回顾模式
- [ ] PWA 支持
- [ ] iOS / Android 打包

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](./LICENSE)

---

<div align="center">

Made with ❤️ for better memories

</div>
</CodeContent>
<parameter name="EmptyFile">false
