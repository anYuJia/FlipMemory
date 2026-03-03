# FlipMemory Android 打包指南

## 📱 项目概述

FlipMemory 使用 **Capacitor** 框架将 Vue 3 Web 应用打包为 Android 原生应用。

## 🛠️ 环境要求

- **Node.js**: >= 20
- **Android Studio**: Arctic Fox (2020.3.1) 或更高版本
- **Android SDK**: API Level 22+ (推荐 33+)
- **JDK**: 17 或更高版本

## 📦 已完成的配置

### Capacitor 配置
- ✅ `@capacitor/core` 和 `@capacitor/cli` 已安装
- ✅ `@capacitor/android` Android 平台已添加
- ✅ `capacitor.config.ts` 配置完成，包含:
  - 状态栏配置（橙色主题）
  - 启动画面配置（2秒自动隐藏）
  - 键盘配置（body resize 模式）
  - 本地通知配置

### Capacitor 插件已集成
- `@capacitor/status-bar` - 状态栏控制
- `@capacitor/splash-screen` - 启动画面
- `@capacitor/keyboard` - 键盘事件
- `@capacitor/camera` - 相机/图库访问
- `@capacitor/preferences` - 本地存储
- `@capacitor/local-notifications` - 本地通知

### 图标资源
所有 PWA 和 Android 图标已生成在 `public/icons/` 目录：
- PWA 图标: 72x72 到 512x512
- Android 密度图标: mdpi 到 xxxhdpi
- Maskable 图标: 192x192, 512x512
- Apple Touch Icon: 180x180
- Favicon: 16x16, 32x32

## 🚀 构建命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 同步到 Android 项目
npm run cap:sync

# 构建并同步（一步完成）
npm run build:android

# 构建、同步并打开 Android Studio
npm run build:android:open

# 打开 Android Studio
npm run cap:android

# 重新生成图标
npm run generate-icons
```

## 📲 打包步骤

### 1. 构建 Web 资源

```bash
npm run build
```

这会生成 `dist/` 目录，包含优化后的 Web 资源。

### 2. 同步到 Android

```bash
npm run cap:sync
```

这会将 `dist/` 目录内容复制到 `android/app/src/main/assets/public/`。

### 3. 打开 Android Studio

```bash
npm run cap:android
```

### 4. 在 Android Studio 中

1. 等待 Gradle 同步完成
2. 如遇网络问题，检查代理设置或使用国内镜像
3. 选择 **Build > Generate Signed Bundle / APK**
4. 选择 APK 或 Android App Bundle
5. 创建或选择签名密钥
6. 选择 release 变体
7. 构建完成后在 `android/app/release/` 找到输出文件

## 🔧 常见问题解决

### Gradle 同步失败（网络问题）

如果遇到 Maven 仓库连接问题，在 `android/build.gradle` 中添加国内镜像：

```gradle
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/public' }
        maven { url 'https://maven.aliyun.com/repository/google' }
        google()
        mavenCentral()
    }
}
```

### 签名 APK

创建签名密钥：
```bash
keytool -genkey -v -keystore flipmemory-release.keystore -alias flipmemory -keyalg RSA -keysize 2048 -validity 10000
```

### 更新应用图标

1. 修改 `public/icons/icon-source.png` 为新图标
2. 运行 `npm run generate-icons`
3. 运行 `npm run cap:sync`
4. 在 Android Studio 中，右键 `res` 文件夹 > **New > Image Asset**

## 📁 目录结构

```
frontend/
├── android/                    # Android 原生项目
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/  # Web 资源（cap sync 后）
│   │   │   ├── java/           # Android 代码
│   │   │   └── res/            # Android 资源
│   │   └── build.gradle
│   └── build.gradle
├── dist/                       # 构建输出
├── public/icons/               # 图标资源
├── src/                        # Vue 源代码
├── capacitor.config.ts         # Capacitor 配置
└── scripts/
    └── generate-icons.mjs      # 图标生成脚本
```

## ⚙️ 配置说明

### capacitor.config.ts

```typescript
{
  appId: 'com.flipmemory.app',    // 应用 ID（需改为你的域名反转）
  appName: 'FlipMemory',          // 应用名称
  webDir: 'dist',                 // Web 构建输出目录
  android: {
    allowMixedContent: true,      // 允许混合内容
    webContentsDebuggingEnabled: true,  // 开发调试（发布时设为 false）
  },
  plugins: {
    StatusBar: { ... },           // 状态栏配置
    SplashScreen: { ... },        // 启动画面配置
    Keyboard: { ... },            // 键盘配置
  }
}
```

### 发布前检查清单

- [ ] 修改 `appId` 为正式应用 ID
- [ ] 设置 `webContentsDebuggingEnabled: false`
- [ ] 配置生产环境 API URL
- [ ] 测试所有功能
- [ ] 创建签名密钥
- [ ] 更新版本号

## 🔗 相关链接

- [Capacitor 文档](https://capacitorjs.com/docs)
- [Android 开发文档](https://developer.android.com/docs)
- [Vue 3 文档](https://vuejs.org/)
