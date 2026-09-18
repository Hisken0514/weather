# ===========================================
# Forma - Multi-stage Dockerfile
# ===========================================

# ---------------------------------
# Stage 1: Build Frontend
# ---------------------------------
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy frontend package files
COPY src/Forma.Web/package.json src/Forma.Web/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy frontend source
COPY src/Forma.Web/ ./

# 整合部署的子路徑設定（透過 docker-compose build args 傳入）
# 預設為 /forma/ 以符合 nginx 路由規劃
ARG VITE_BASE_PATH=/forma/
ARG VITE_API_BASE_URL=/forma/api
ARG VITE_KPI_URL=/iskpi
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KPI_URL=$VITE_KPI_URL

# Build frontend
RUN pnpm build

# ---------------------------------
# Stage 2: Build Backend
# ---------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build

WORKDIR /src
# 安裝Npgsql 驅動程式
RUN apt-get update && apt-get install -y libgssapi-krb5-2
# Copy solution and project files
COPY Forma.sln ./
COPY src/Forma.Domain/Forma.Domain.csproj src/Forma.Domain/
COPY src/Forma.Shared/Forma.Shared.csproj src/Forma.Shared/
COPY src/Forma.Application/Forma.Application.csproj src/Forma.Application/
COPY src/Forma.Infrastructure/Forma.Infrastructure.csproj src/Forma.Infrastructure/
COPY src/Forma.API/Forma.API.csproj src/Forma.API/

# Restore dependencies (only API project, skip tests)
RUN dotnet restore src/Forma.API/Forma.API.csproj

# Copy all source code
COPY src/ src/

# Build and publish
RUN dotnet publish src/Forma.API/Forma.API.csproj -c Release -o /app/publish

# ---------------------------------
# Stage 3: Runtime
# ---------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

# Create non-root user for security (Ubuntu-based image)
RUN groupadd --system --gid 1001 forma && \
    useradd --system --uid 1001 --gid forma --shell /bin/false forma

# Copy published backend
COPY --from=backend-build /app/publish ./

# Copy frontend build to wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Create directories for uploads and data
RUN mkdir -p /app/uploads /app/data && \
    chown -R forma:forma /app

# Switch to non-root user
USER forma

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/api/health || exit 1

# Start application
ENTRYPOINT ["dotnet", "Forma.API.dll"]
