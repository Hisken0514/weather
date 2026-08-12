# ==========================================
# 階段一：構建階段 (Build Stage)
# ==========================================
FROM node:20-alpine AS build-stage

# 設定容器內的工作目錄
WORKDIR /app

# 1. 先複製 package.json 相關檔案並安裝套件
#    (這樣做可以利用 Docker 快取，只要 package.json 沒變就不需要重新 npm install)
COPY package*.json ./
RUN pnpm i --frozen-lockfile

# 2. 複製前端的所有程式碼並執行打包
COPY . .
RUN pnpm run build

# ==========================================
# 階段二：運行階段 (Production Stage)
# ==========================================
FROM nginx:alpine AS production-stage

# 1. 從第一階段將打包好的靜態檔案複製到 Nginx 的預設網頁目錄
#    注意：若是 Vite/Vue 預設產出目錄是 dist；若是傳統 Create React App 則是 build
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 2. (可選) 若前端有使用 React Router / Vue Router 的 History 模式，可複製自訂 Nginx 設定檔
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 3. 暴露 80 Port 並啟動 Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]