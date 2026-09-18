#!/bin/sh
set -e

# 等待其他服務就緒的檢查（如果需要）
# ./wait-for-it.sh $DATABASE_HOST:$DATABASE_PORT

# 設置默認環境變數
: ${NEXT_PUBLIC_API_URL:="http://ishabackend.local:8080"}
: ${NEXT_PUBLIC_DOMAIN:="https://test-kpi.isafe.org.tw"}

# 執行原始命令
exec "$@"


