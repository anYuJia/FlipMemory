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
BUILD_GRADLE_FILE="$ANDROID_DIR/app/build.gradle"

# 0. 自动递增 Android 版本号（versionCode 必须单调递增）
echo -e "${BLUE}🔢 阶段 0: 自动递增 Android 版本号...${NC}"
if [ ! -f "$BUILD_GRADLE_FILE" ]; then
  echo -e "${RED}❌ 未找到 build.gradle: $BUILD_GRADLE_FILE${NC}"
  exit 1
fi

CURRENT_VERSION_CODE=$(grep -E '^[[:space:]]*versionCode[[:space:]]+[0-9]+' "$BUILD_GRADLE_FILE" | awk '{print $2}' | head -n 1)
CURRENT_VERSION_NAME=$(grep -E '^[[:space:]]*versionName[[:space:]]+"[^"]+"' "$BUILD_GRADLE_FILE" | sed -E 's/.*"([^"]+)".*/\1/' | head -n 1)

if [ -z "$CURRENT_VERSION_CODE" ]; then
  echo -e "${RED}❌ 无法解析 versionCode${NC}"
  exit 1
fi

NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

# versionName 策略：
# 1) 如果是 x.y.z，则仅递增 z
# 2) 否则追加 .<newVersionCode>
if [[ "$CURRENT_VERSION_NAME" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
  NEW_VERSION_NAME="${MAJOR}.${MINOR}.$((PATCH + 1))"
elif [ -n "$CURRENT_VERSION_NAME" ]; then
  NEW_VERSION_NAME="${CURRENT_VERSION_NAME}.${NEW_VERSION_CODE}"
else
  NEW_VERSION_NAME="1.0.${NEW_VERSION_CODE}"
fi

perl -i -pe "s/^(\s*versionCode\s+)\d+/\${1}${NEW_VERSION_CODE}/" "$BUILD_GRADLE_FILE"
perl -i -pe "s/^(\s*versionName\s+\")[^\"]+(\")/\${1}${NEW_VERSION_NAME}\${2}/" "$BUILD_GRADLE_FILE"

echo -e "${GREEN}✅ versionCode: ${CURRENT_VERSION_CODE} -> ${NEW_VERSION_CODE}${NC}"
echo -e "${GREEN}✅ versionName: ${CURRENT_VERSION_NAME:-N/A} -> ${NEW_VERSION_NAME}${NC}"

# 1. 前端构建
echo -e "${BLUE}📦 阶段 1: 前端生产环境构建...${NC}"
cd "$FRONTEND_DIR" || exit
rm -rf dist 2>/dev/null
npx vite build --emptyOutDir
if [ $? -ne 0 ]; then echo -e "${RED}❌ 前端构建失败${NC}"; exit 1; fi

# 2. 资源同步（先清空再写入，避免旧 hash 文件累积导致 APK 越来越大）
echo -e "${BLUE}🔄 阶段 2: 同步 Web 资源到原生工程...${NC}"
TARGET_ASSETS="$ANDROID_DIR/app/src/main/assets/public"
rm -rf "$TARGET_ASSETS" 2>/dev/null
mkdir -p "$TARGET_ASSETS"

# 首选 rsync（会删除目标中已不存在的文件），没有则退化为 cp
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete dist/ "$TARGET_ASSETS/" || { echo -e "${RED}❌ rsync 资源同步失败${NC}"; exit 1; }
else
  cp -R dist/* "$TARGET_ASSETS/" || { echo -e "${RED}❌ 资源复制失败${NC}"; exit 1; }
fi

# 同步 Capacitor 平台配置与插件
npx cap sync android
if [ $? -ne 0 ]; then echo -e "${RED}⚠️ Capacitor 同步失败，尝试继续编译...${NC}"; fi

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
