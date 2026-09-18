# 台灣政府開放資料 MCP Server(勞動部/環境部)。
#
# Build: docker build -t govdata-mcp .
# Run:   docker run -p 8000:8000 --env-file .env govdata-mcp
#
# 內網部署時,直接把 ISHAAudit 主系統的 AgentMcpEndpoint.Endpoint 設定成
# http://<這個容器的內網 host>:8000/mcp,AuthType 選 None 即可(見 README.md)。

FROM python:3.12-slim

WORKDIR /app

# 只複製 requirements 先裝,分層快取——改 app 程式碼不會讓 pip install 重跑。
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# 不用 root 跑——內網服務也一樣,習慣要養好。
RUN useradd --create-home --shell /usr/sbin/nologin appuser
USER appuser

EXPOSE 8000

# MCP_HOST/MCP_PORT/MOENV_API_KEY 等設定一律用環境變數注入(見 .env.example),
# 不烘進 image 裡。
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=8000

ENTRYPOINT ["python3", "-m", "app.server"]
