#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$ScriptDir   = $PSScriptRoot
$ComposeFile = Join-Path $ScriptDir "docker-compose.dev.yml"
$EnvFile     = Join-Path $ScriptDir ".env"

# ================================================================
#  Output helpers
# ================================================================
function Write-Header {
    Write-Host "================================================" -ForegroundColor Blue
    Write-Host "   ISHA Integrated System -- Dev Manager"        -ForegroundColor Blue
    Write-Host "================================================" -ForegroundColor Blue
}

function Show-Urls {
    Write-Host ""
    Write-Host "Services will be available at:" -ForegroundColor Green
    Write-Host "  KPI  Frontend > http://localhost:3000"         -ForegroundColor Cyan
    Write-Host "  KPI  API      > http://localhost:5013/swagger" -ForegroundColor Cyan
    Write-Host "  Forma Frontend> http://localhost:5173"         -ForegroundColor Cyan
    Write-Host "  Forma API     > http://localhost:5053/swagger" -ForegroundColor Cyan
    Write-Host "  Redis         > localhost:6379"
    Write-Host ""
}

# ================================================================
#  Pre-flight checks
# ================================================================
function Test-Env {
    if (-not (Test-Path $EnvFile)) {
        Write-Host "[WARNING] .env not found, copying from .env.example..." -ForegroundColor Yellow
        Copy-Item (Join-Path $ScriptDir ".env.example") $EnvFile
        Write-Host "[ERROR] Please edit .env and fill in the required fields, then re-run:" -ForegroundColor Red
        Write-Host "   KPI_DB_CONNECTION   -- SQL Server connection string"
        Write-Host "   FORMA_DB_CONNECTION -- PostgreSQL connection string"
        exit 1
    }

    $content = Get-Content $EnvFile -Raw

    if ($content -notmatch '(?m)^KPI_DB_CONNECTION=') {
        Write-Host "[ERROR] KPI_DB_CONNECTION is not set in .env" -ForegroundColor Red
        exit 1
    }
    if ($content -match 'KPI_DB_CONNECTION=Server=your-server') {
        Write-Host "[ERROR] KPI_DB_CONNECTION is still the placeholder value -- please update .env" -ForegroundColor Red
        exit 1
    }

    if ($content -notmatch '(?m)^FORMA_DB_CONNECTION=') {
        Write-Host "[ERROR] FORMA_DB_CONNECTION is not set in .env" -ForegroundColor Red
        Write-Host "   Example: Host=192.168.50.171;Port=5432;Database=forma;Username=postgres;Password=xxx"
        exit 1
    }
    if ($content -match 'FORMA_DB_CONNECTION=Host=your-pg-server') {
        Write-Host "[ERROR] FORMA_DB_CONNECTION is still the placeholder value -- please update .env" -ForegroundColor Red
        Write-Host "   Example: Host=192.168.50.171;Port=5432;Database=forma;Username=postgres;Password=xxx"
        exit 1
    }

    Write-Host "[OK] .env check passed" -ForegroundColor Green
}

function Test-Docker {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    docker info *> $null
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($exit -ne 0) {
        Write-Host "[ERROR] Docker is not running -- please start Docker Desktop" -ForegroundColor Red
        exit 1
    }
}

# ================================================================
#  Commands
# ================================================================
function Invoke-Up([string[]]$Extra) {
    Test-Docker
    Test-Env
    Write-Host "[INFO] Starting dev environment (with build)..." -ForegroundColor Green
    & docker compose -f $ComposeFile --env-file $EnvFile up --build @Extra
}

function Invoke-Down([string[]]$Extra) {
    Test-Docker
    Write-Host "[INFO] Stopping and removing containers..." -ForegroundColor Yellow
    & docker compose -f $ComposeFile down @Extra
}

function Invoke-Restart([string]$Service) {
    Test-Docker
    if ($Service) {
        Write-Host "[INFO] Restarting $Service ..." -ForegroundColor Yellow
        & docker compose -f $ComposeFile --env-file $EnvFile restart $Service
    } else {
        Write-Host "[INFO] Restarting all services..." -ForegroundColor Yellow
        & docker compose -f $ComposeFile --env-file $EnvFile restart
    }
}

function Invoke-Logs([string]$Service) {
    Test-Docker
    if ($Service) {
        & docker compose -f $ComposeFile logs -f $Service
    } else {
        & docker compose -f $ComposeFile logs -f
    }
}

function Invoke-Ps {
    Test-Docker
    & docker compose -f $ComposeFile ps
}

function Invoke-Clean {
    Test-Docker
    Write-Host "[WARNING] This will remove all dev containers and named volumes (node_modules cache, etc.)" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (y/n)"
    if ($confirm -ieq 'y') {
        & docker compose -f $ComposeFile down -v --remove-orphans
        Write-Host "[OK] Cleanup complete" -ForegroundColor Green
    } else {
        Write-Host "Cancelled"
    }
}

# ================================================================
#  Main
# ================================================================
Write-Header

$cmd  = if ($args.Count -gt 0) { $args[0] } else { "" }
$rest = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }

switch ($cmd) {
    "up"      { Show-Urls; Invoke-Up $rest }
    "down"    { Invoke-Down $rest }
    "restart" { Invoke-Restart ($rest | Select-Object -First 1) }
    "logs"    { Invoke-Logs ($rest | Select-Object -First 1) }
    "ps"      { Invoke-Ps }
    "clean"   { Invoke-Clean }
    default {
        Write-Host ""
        Write-Host "Usage: dev.bat <command> [options]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  up              Start all services (with build)"
        Write-Host "  up -d           Start in background (detached)"
        Write-Host "  down            Stop and remove containers"
        Write-Host "  down -v         Stop and remove containers + volumes"
        Write-Host "  restart [svc]   Restart all or a specific service"
        Write-Host "  logs [svc]      Follow logs (all or specific service)"
        Write-Host "  ps              Show container status"
        Write-Host "  clean           Remove all containers and named volumes"
        Write-Host ""
        Write-Host "Service names:"
        Write-Host "  kpi-api  kpi-web  forma  kpi_redis"
        Write-Host ""
        Show-Urls
    }
}
