# 基礎階段
FROM node:24-alpine AS base

# 安裝 curl 等常用工具（前端容器可診斷網路）
RUN apk add --no-cache libc6-compat curl bash iputils bind-tools

# 依賴階段
FROM base AS deps
WORKDIR /app

# 安裝依賴所需的額外套件
RUN apk add --no-cache libc6-compat

# 複製依賴文件
COPY package.json yarn.lock ./

# 安裝依賴（移除 --frozen-lockfile 標誌）
RUN yarn install

# 構建階段
FROM base AS builder
WORKDIR /app

# 複製依賴
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 加入 BASE_PATH 環境變數（如 =/iskpi）
ARG BASE_PATH=/iskpi
ENV BASE_PATH=${BASE_PATH}
ARG NEXT_PUBLIC_BASE_PATH=/iskpi
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ARG NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_PUBLIC_GEMINI_API_KEY=${NEXT_PUBLIC_GEMINI_API_KEY}
# 構建應用
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_FORMA_URL=/iskpi/forma/
ENV NEXT_PUBLIC_FORMA_URL=${NEXT_PUBLIC_FORMA_URL}

ENV API=http://kpibackend:8080


RUN BASE_PATH=$BASE_PATH NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH yarn build

# 運行階段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# runner 階段需要這些環境變數，next start 讀取 next.config.js 時會用到
ARG BASE_PATH=/iskpi
ARG NEXT_PUBLIC_BASE_PATH=/iskpi
ENV BASE_PATH=${BASE_PATH}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 複製必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./

# 複製環境變數處理腳本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh


# 設置容器配置
EXPOSE 3000
ENV PORT=3000

# 設置入口點和啟動命令
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["yarn", "start"]