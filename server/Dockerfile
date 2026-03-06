# 使用 Node.js 20 镜像
FROM node:20-alpine

# 安装运行时必需的系统库 (解决 Prisma 在 Alpine 下的崩溃)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制配置文件
COPY package*.json pnpm-lock.yaml* ./

# 安装全量依赖
RUN pnpm install

# 复制源代码和 Prisma
COPY . .

# 关键：告诉 Prisma 我们在 Alpine 环境
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# 生成 Prisma 客户端
RUN npx prisma generate

# 设置环境变量
ENV NODE_ENV=production

EXPOSE 4000

# 生产环境启动脚本：使用 db push 强制同步架构（忽略缺失的迁移文件）
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx src/server.ts"]
