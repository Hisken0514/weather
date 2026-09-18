#!/bin/bash

# 取得腳本所在目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 設定專案路徑 (相對於腳本所在目錄)
INFRA_PROJ="$SCRIPT_DIR/src/Forma.Infrastructure"
STARTUP_PROJ="$SCRIPT_DIR/src/Forma.API"

# 顏色設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Forma 專案 EF Core 遷移管理工具        ${NC}"
echo -e "${BLUE}=======================================${NC}"

echo "1) 建立新遷移 (Migrations Add)"
echo "2) 更新資料庫 (Database Update)"
echo "3) 移除最後一次遷移 (Migrations Remove)"
echo "4) 列出所有遷移 (Migrations List)"
echo "q) 離開"
echo -ne "${YELLOW}請選擇操作: ${NC}"
read choice

case $choice in
    1)
        echo -ne "${YELLOW}請輸入遷移名稱 (例如 AddLinkTarget): ${NC}"
        read migration_name
        if [ -z "$migration_name" ]; then
            echo -e "${RED}錯誤: 名稱不能為空${NC}"
        else
            dotnet ef migrations add "$migration_name" --project "$INFRA_PROJ" --startup-project "$STARTUP_PROJ"
        fi
        ;;
    2)
        echo -e "${GREEN}正在更新資料庫至最新版本...${NC}"
        dotnet ef database update --project "$INFRA_PROJ" --startup-project "$STARTUP_PROJ"
        ;;
    3)
        echo -e "${RED}警告: 這將移除最後一個尚未套用的遷移檔案！${NC}"
        echo -ne "${YELLOW}確定要繼續嗎? (y/n): ${NC}"
        read confirm
        if [ "$confirm" = "y" ]; then
            dotnet ef migrations remove --project "$INFRA_PROJ" --startup-project "$STARTUP_PROJ"
        fi
        ;;
    4)
        echo -e "${GREEN}目前所有遷移狀態:${NC}"
        dotnet ef migrations list --project "$INFRA_PROJ" --startup-project "$STARTUP_PROJ"
        ;;
    q)
        exit 0
        ;;
    *)
        echo -e "${RED}無效的選擇${NC}"
        ;;
esac