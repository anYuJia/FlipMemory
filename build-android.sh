#!/bin/bash

# =================================================================
# FlipMemory Pro - Android 超强兼容构建脚本 (Bypass Sync Errors)
# =================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 启动加固版构建流水线...${NC}"

PROJECT_ROOT=$(pwd)
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"
SDK_BUILD_TOOLS_DIR=$(find ~/Library/Android/sdk/build-tools -maxdepth 1 -type d | sort -r | head -n 1)

ZIPALIGN="$SDK_BUILD_TOOLS_DIR/zipalign"
APKSIGNER="$SDK_BUILD_TOOLS_DIR/apksigner"

# 1. 前端构建
echo -e "${BLUE}📦 阶段 1: 前端生产环境构建...${NC}"
cd "$FRONTEND_DIR" || exit
rm -rf dist 2>/dev/null
npx vite build --emptyOutDir
if [ $? -ne 0 ]; then echo -e "${RED}❌ 前端构建失败${NC}"; exit 1; fi

# 2. 暴力同步 (绕过权限错误)
echo -e "${BLUE}🔄 阶段 2: 暴力覆盖原生资源...${NC}"
# 目标路径
TARGET_ASSETS="$ANDROID_DIR/app/src/main/assets/public"
# 如果目录删不掉，就直接强制覆盖内部文件
mkdir -p "$TARGET_ASSETS"
cp -R dist/* "$TARGET_ASSETS/" 2>/dev/null || echo "警告: 部分文件覆盖受限，尝试继续..."

# 运行 Capacitor 仅更新插件配置 (跳过文件拷贝)
npx cap update android
if [ $? -ne 0 ]; then echo -e "${RED}⚠️ 插件更新警告，尝试继续编译...${NC}"; fi

# 3. Gradle 编译
echo -e "${BLUE}🏗️ 阶段 3: Gradle 核心编译...${NC}"
cd "$ANDROID_DIR" || exit
# 彻底物理抹除 intermediates 缓存，解决 R.jar 等锁定问题
rm -rf app/build/intermediates 2>/dev/null
# 杀掉可能锁定文件的 Gradle 进程
./gradlew --stop 2>/dev/null
./gradlew assembleRelease
if [ $? -ne 0 ]; then echo -e "${RED}❌ Gradle 编译失败${NC}"; exit 1; fi

# 4. 签名
echo -e "${BLUE}✍️ 阶段 4: 签名...${NC}"
UNSIGNED_APK="app/build/outputs/apk/release/app-release-unsigned.apk"
ALIGNED_APK="app/build/outputs/apk/release/app-aligned.apk"
FINAL_APK_NAME="FlipMemory-Pro-v3-Final.apk"

"$ZIPALIGN" -v -f -p 4 "$UNSIGNED_APK" "$ALIGNED_APK"
"$APKSIGNER" sign --ks ultimate.keystore --ks-key-alias ultimate-alias --ks-pass pass:flipmemory --key-pass pass:flipmemory --out "$PROJECT_ROOT/$FINAL_APK_NAME" "$ALIGNED_APK"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功: $PROJECT_ROOT/$FINAL_APK_NAME${NC}"
else
    echo -e "${RED}❌ 签名失败${NC}"
    exit 1
fi
