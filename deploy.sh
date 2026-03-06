#!/bin/bash

# FlipMemory 企业级一键部署脚本 (Hardened & Polished)
REMOTE_IP="139.199.55.169"
REMOTE_USER="root"
SSH_KEY="$HOME/.ssh/tencent.pem"
REMOTE_PATH="/root/flipmemory"

echo "------------------------------------------------"
echo "🚀 开始最终加固版部署流程..."
echo "------------------------------------------------"

# 1. 密钥检查
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ 错误: 找不到密钥文件 $SSH_KEY"
    exit 1
fi
chmod 400 "$SSH_KEY"

# 2. 同步代码 (排除冗余，强制覆盖)
echo "📦 正在全量同步代码..."
rsync -avz --delete -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'frontend/node_modules' \
  --exclude 'server/node_modules' \
  ./ $REMOTE_USER@$REMOTE_IP:$REMOTE_PATH/

# 3. 远程执行构建与启动
echo "🛠 正在远程环境执行混合构建..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_IP << EOF
  cd $REMOTE_PATH
  
  # 确保环境变量存在 (生产环境默认值)
  if [ ! -f .env ]; then
    echo "DATABASE_URL=postgresql://postgres:pyu01234@postgres:5432/flipmemory" > .env
    echo "JWT_SECRET=flipmemory_secret_key_2026" >> .env
  fi

  # 1. 环境自愈：安装 pnpm
  if ! command -v pnpm &> /dev/null; then
    echo "--- 正在安装 pnpm ---"
    npm install -g pnpm
  fi

  # 2. 物理机预构建前端 (解决 Docker 内部构建 PWA 的路径玄学问题)
  echo "--- 正在构建前端产物 ---"
  cd frontend
  pnpm install
  npm run build
  cd ..

  # 3. 容器生命周期管理
  DOCKER_CMD="docker-compose"
  if ! command -v \$DOCKER_CMD &> /dev/null; then DOCKER_CMD="docker compose"; fi
  
  echo "--- 使用 \$DOCKER_CMD 重构并启动 ---"
  \$DOCKER_CMD down
  \$DOCKER_CMD build --no-cache
  \$DOCKER_CMD up -d
  
  echo "------------------------------------------------"
  echo "✅ 部署圆满成功！"
  echo "前端地址: http://$REMOTE_IP:3000"
  echo "后端接口: http://$REMOTE_IP:4000"
  echo "------------------------------------------------"
  \$DOCKER_CMD ps
EOF
