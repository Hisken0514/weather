# ==========================================
# 階段一：構建專案 (Builder Stage)
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /app

# 1. 安裝 Alpine 系統編譯工具與 libc 庫
RUN apk add --no-cache libc6-compat python3 make g++

# 2. 全域安裝 pnpm（跳過 Corepack 下載版本衝突）
RUN npm install -g pnpm

# 3. 複製依賴檔並進行完整安裝
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 設定允許 build 腳本，避免 ERR_PNPM_IGNORED_BUILDS 錯誤
RUN pnpm install --frozen-lockfile

# 4. 複製所有專案原始碼
COPY . .

# 5. 設定環境變數並編譯
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ARG NEXT_PUBLIC_BASEURL
RUN pnpm run build

# ==========================================
# 階段二：正式運行 (Runner Stage)
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 1. 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 2. 僅複製 standalone 打包結果（極輕量）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]