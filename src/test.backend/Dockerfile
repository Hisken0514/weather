# 1. 執行環境 (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# 2. SDK 編譯環境
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# 複製專案檔並還原套件 (這裡相對於 /src 工作目錄)
COPY ["src/test.backend/test.csproj", "src/test.backend/"]
RUN dotnet restore "src/test.backend/test.csproj"

# 複製專案所有原始碼
COPY . .

# 修正重點：正確切換到後端專案目錄 (從 /src 切換至 /src/src/test.backend)
WORKDIR "/src/src/test.backend"
RUN dotnet build "test.csproj" -c $BUILD_CONFIGURATION -o /app/build

# 3. 發布階段
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "test.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 4. 最終運行階段
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "test.dll"]