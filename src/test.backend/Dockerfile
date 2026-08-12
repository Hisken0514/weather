# 1. Runtime 階段
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# 2. Build 階段
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# 複製 csproj 並執行 restore
COPY test.csproj ./
RUN dotnet restore test.csproj

# 複製整個專案
COPY . .

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
