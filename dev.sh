#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.dev.yml"
ENV_FILE="$SCRIPT_DIR/.env"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}   ISHA 整合系統 — Dev 環境管理工具${NC}"
    echo -e "${BLUE}================================================${NC}"
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠️  找不到 .env，正在從 .env.example 複製...${NC}"
        cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
        echo -e "${RED}❗ 請先編輯 .env，填入以下必要欄位後再重新執行：${NC}"
        echo -e "   KPI_DB_CONNECTION  — SQL Server 連線字串"
        echo -e "   （dev 模式：Forma 使用 SQLite，不需 FORMA_DB_CONNECTION）"
        exit 1
    fi

    if ! grep -q "^KPI_DB_CONNECTION=" "$ENV_FILE" || grep -q "KPI_DB_CONNECTION=Server=your-server" "$ENV_FILE"; then
        echo -e "${RED}❗ .env 中的 KPI_DB_CONNECTION 尚未設定，請填入正確的 SQL Server 連線字串${NC}"
        exit 1
    fi

    if ! grep -q "^FORMA_DB_CONNECTION=" "$ENV_FILE" || grep -q "FORMA_DB_CONNECTION=Host=your-pg-server" "$ENV_FILE"; then
        echo -e "${RED}❗ .env 中的 FORMA_DB_CONNECTION 尚未設定，請填入正確的 PostgreSQL 連線字串${NC}"
        echo -e "   範例：Host=192.168.50.171;Port=5432;Database=forma;Username=postgres;Password=xxx"
        exit 1
    fi

    echo -e "${GREEN}✓ .env 檢查通過${NC}"
}

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❗ Docker 未啟動，請先啟動 Docker Desktop${NC}"
        exit 1
    fi
}

cmd_up() {
    check_docker
    check_env
    echo -e "${GREEN}▶  啟動 dev 環境（含 build）...${NC}"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build "$@"
}

cmd_down() {
    check_docker
    echo -e "${YELLOW}■  停止並移除容器...${NC}"
    docker compose -f "$COMPOSE_FILE" down "$@"
}

cmd_restart() {
    check_docker
    local service=${1:-}
    if [ -n "$service" ]; then
        echo -e "${YELLOW}↺  重啟 $service ...${NC}"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart "$service"
    else
        echo -e "${YELLOW}↺  重啟所有服務...${NC}"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
    fi
}

cmd_logs() {
    check_docker
    local service=${1:-}
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

cmd_ps() {
    check_docker
    docker compose -f "$COMPOSE_FILE" ps
}

cmd_clean() {
    check_docker
    echo -e "${RED}⚠️  這將刪除所有 dev 容器與 named volumes（node_modules 快取等）${NC}"
    echo -ne "${YELLOW}確定要繼續嗎? (y/n): ${NC}"
    read -r confirm
    if [ "$confirm" = "y" ]; then
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
        echo -e "${GREEN}✓ 清除完成${NC}"
    else
        echo "已取消"
    fi
}

print_urls() {
    echo ""
    echo -e "${GREEN}服務啟動後可從以下 URL 存取：${NC}"
    echo -e "  KPI  前端  →  ${BLUE}http://localhost:3000${NC}"
    echo -e "  KPI  API   →  ${BLUE}http://localhost:5013/swagger${NC}"
    echo -e "  Forma 前端 →  ${BLUE}http://localhost:5173${NC}"
    echo -e "  Forma API  →  ${BLUE}http://localhost:5053/swagger${NC}"
    echo -e "  Redis      →  localhost:6379"
    echo ""
}

# ---- 主選單 ----
print_header

case "${1:-}" in
    up)
        shift
        print_urls
        cmd_up "$@"
        ;;
    down)
        shift
        cmd_down "$@"
        ;;
    restart)
        shift
        cmd_restart "$@"
        ;;
    logs)
        shift
        cmd_logs "$@"
        ;;
    ps)
        cmd_ps
        ;;
    clean)
        cmd_clean
        ;;
    *)
        echo ""
        echo "用法：./dev.sh <指令> [選項]"
        echo ""
        echo "指令："
        echo "  up              啟動所有服務（含 build）"
        echo "  up -d           背景執行"
        echo "  down            停止並移除容器"
        echo "  down -v         停止並一併清除 volumes"
        echo "  restart [服務]  重啟全部或指定服務"
        echo "  logs [服務]     查看 log（不指定則全部）"
        echo "  ps              顯示容器狀態"
        echo "  clean           清除容器與所有 named volumes"
        echo ""
        echo "服務名稱："
        echo "  kpi-api  kpi-web  forma-api  forma-web  kpi_redis"
        echo ""
        print_urls
        ;;
esac
