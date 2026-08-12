# ==========================================
# 階段一：構建階段 (Build Stage)
# ==========================================
FROM node:20-alpine AS build-stage

# 設定容器內的工作目錄
WORKDIR /app

# 1. 關鍵修正：啟用 Node.js 內建的 corepack 以支援 pnpm
RUN corepack enable pnpm

# 2. 複製 package.json 以及 pnpm-lock.yaml (確保凍結版本安裝成功)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile

# 3. 複製前端的所有程式碼並執行打包
COPY . .
RUN pnpm run build

# ==========================================
# 階段二：運行階段 (Production Stage)
# ==========================================
FROM nginx:alpine AS production-stage

# 1. 從第一階段將打包好的靜態檔案複製到 Nginx 的預設網頁目錄
#    (若使用的是 Vite / Next.js export 產出為 dist，請確認輸出目錄名稱)
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 2. 暴露 80 Port 並啟動 Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]