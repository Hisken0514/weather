# 基礎映像
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
ARG APP_UID=1001
ENV APP_UID=$APP_UID 

# 創建非 root 用戶
RUN adduser --system --uid $APP_UID dotnetuser

USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# 構建階段
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["WebAPI1/WebAPI1.csproj", "WebAPI1/"]
RUN dotnet restore "WebAPI1/WebAPI1.csproj"
COPY . .
WORKDIR "/src/WebAPI1"
RUN dotnet build "WebAPI1.csproj" -c $BUILD_CONFIGURATION -o /app/build


# 發布階段
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "WebAPI1.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 最終階段
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# 安裝 curl（適用於 Debian/Ubuntu 基礎映像）
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
# 非敏感配置
ENV Logging__LogLevel__Default=Information \
    Logging__LogLevel__Microsoft.AspNetCore=Warning \
    AllowedHosts=* \
    ConnectionStrings__Redis=kpi_redis:6380,password=MyP@ssw0rd123,abortConnect=false,connectRetry=3

ENTRYPOINT ["dotnet", "WebAPI1.dll"]