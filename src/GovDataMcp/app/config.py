"""環境變數設定——12-factor 風格,全部走環境變數注入,方便 docker run -e / docker-compose
environment / k8s ConfigMap 隨部署環境調整,不用改程式碼、不用重新 build image。
"""
from __future__ import annotations

import os


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = _env_int("MCP_PORT", 8000)

HTTP_TIMEOUT_SECONDS = _env_float("HTTP_TIMEOUT_SECONDS", 15.0)

# 勞動部開放資料 API(政府開放資料整合及作業管理系統 OdService)——CKAN 風格,
# group(分類)/tag(標籤)/dataset(詮釋資料)/datastore(實際資料列)四層,
# 全部端點都不需要認證。詳見:
# https://apiservice.mol.gov.tw/OdService/doc/API%20Service%20開發指引.pdf
MOL_BASE_URL = os.environ.get("MOL_BASE_URL", "https://apiservice.mol.gov.tw/OdService")

# 環境部環境資料開放平臺——查資料一定要帶 api_key(未帶會直接 500),免費註冊會員即可
# 取得(有效期一年,5000 次/日;未註冊在 300 次/日內其實也能用,但這個 wrapper 一律
# 要求設定好金鑰,行為才可預期)。註冊/條款頁面:
MOENV_BASE_URL = os.environ.get("MOENV_BASE_URL", "https://data.moenv.gov.tw/api/v2")
MOENV_API_KEY = os.environ.get("MOENV_API_KEY", "").strip() or None
MOENV_API_TERM_URL = "https://data.moenv.gov.tw/api-term"
MOENV_DATASET_CATALOG_URL = "https://data.moenv.gov.tw/dataset"
