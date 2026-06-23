# === Builder 阶段：全量依赖 + 编译 ===
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate
RUN pnpm build

# === Runtime 阶段：只保留 production 依赖 ===
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm

WORKDIR /app

# 只安装 production 依赖（排除 tsx/typescript/vitest/esbuild/pino-pretty）
COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install --prod

# Prisma schema + 重新生成 client
COPY prisma ./prisma
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

# 从 builder 复制编译产物
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 4000

# 生产环境启动：db push 同步 schema + node 运行编译产物
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]
