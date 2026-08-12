# 1. Runtime 階段
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# 2. Build 階段
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release

# 關鍵：工作目錄直接設為根目錄 /
WORKDIR /

# 複製 csproj 並執行 restore
COPY src/test.backend/test.csproj src/test.backend/
RUN dotnet restore src/test.backend/test.csproj

# 複製整個專案的所有檔案
COPY . .

# 切換到後端目錄進行打包
WORKDIR /src/test.backend
RUN dotnet build test.csproj -c $BUILD_CONFIGURATION -o /app/build

# 3. Publish 階段
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish test.csproj -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# 4. Final 運行階段
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "test.dll"]