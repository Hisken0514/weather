# ==========================================
# 階段一：安裝依賴 (Deps Stage) 
# ==========================================
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++
# 啟用 corepack 以支援 pnpm
RUN corepack enable pnpm

# 2. 複製依賴檔案並安裝
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm i --no-frozen-lockfile

# ==========================================
# 階段二：構建專案 (Builder Stage)
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /app

# 1. 啟用 corepack
RUN corepack enable pnpm

# 2. 複製 node_modules 與專案檔案
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 4. 執行 Next.js 打包 (會產出 .next/standalone)
RUN pnpm run build

# ==========================================
# 階段三：正式運行 (Runner Stage)
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

# 1. 建立非 root 權限使用者（提升容器安全性）
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 2. 複製靜態檔案與獨立打包結果 (Standalone)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 3. 直接用 Node 執行 standalone 產出的 server.js
CMD ["node", "server.js"]