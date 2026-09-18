#!/bin/bash

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

# 基本設定
MIGRATION_PATH="./Migration"
CONTEXT_PATH="./Context"
PROJECT_NAME=""
CONTEXT_NAME=""
PROJECT_PATH="."
SELECTED_CONTEXT=""

# 檢查是否為 .NET 專案
check_dotnet_project() {
    log_debug "檢查 .NET 專案檔案..."
    
    # 直接檢查 .csproj 檔案
    if ls *.csproj >/dev/null 2>&1; then
        PROJECT_PATH="."
        local csproj_file=$(ls *.csproj | head -1)
        log_success "找到 .NET 專案檔案: $csproj_file"
        return 0
    fi
    
    # 檢查 .sln 檔案
    if ls *.sln >/dev/null 2>&1; then
        PROJECT_PATH="."
        local sln_file=$(ls *.sln | head -1)
        log_success "找到 .NET 方案檔案: $sln_file"
        return 0
    fi
    
    log_warning "未檢測到 .NET 專案檔案"
    echo "請選擇："
    echo "1. 手動輸入專案路徑"
    echo "2. 使用當前目錄繼續"
    echo "3. 退出"
    read -p "請選擇 (1-3): " choice
    
    case $choice in
        1)
            read -p "請輸入專案路徑: " custom_path
            PROJECT_PATH="$custom_path"
            ;;
        2)
            PROJECT_PATH="."
            log_info "使用當前目錄"
            ;;
        3)
            exit 0
            ;;
    esac
}

# 初始化目錄
init_directories() {
    if [ -d "./Migrations" ]; then
        MIGRATION_PATH="./Migrations"
        log_info "使用現有的 Migrations 目錄"
    elif [ ! -d "$MIGRATION_PATH" ]; then
        mkdir -p "$MIGRATION_PATH"
        log_info "建立 Migration 目錄: $MIGRATION_PATH"
    fi
    
    if [ -d "./Context" ]; then
        CONTEXT_PATH="./Context"
        log_info "使用現有的 Context 目錄"
    elif [ ! -d "$CONTEXT_PATH" ]; then
        mkdir -p "$CONTEXT_PATH"
        log_info "建立 Context 目錄: $CONTEXT_PATH"
    fi
}

# 取得專案名稱
get_project_name() {
    if [ -z "$PROJECT_NAME" ]; then
        if ls *.csproj >/dev/null 2>&1; then
            PROJECT_NAME=$(ls *.csproj | head -1 | sed 's/.csproj$//')
        else
            PROJECT_NAME=$(basename "$(pwd)")
        fi
    fi
    log_debug "專案名稱: $PROJECT_NAME"
}

# 搜尋並列出所有 DbContext
find_all_contexts() {
    local contexts=()
    
    # 搜尋所有 DbContext 檔案
    while IFS= read -r -d '' file; do
        local basename_file=$(basename "$file" .cs)
        if [[ $basename_file == *"Context" ]] || [[ $basename_file == *"DbContext" ]]; then
            contexts+=("$basename_file")
        fi
    done < <(find . -name "*.cs" -type f -print0 2>/dev/null)
    
    # 移除重複項目
    printf '%s\n' "${contexts[@]}" | sort -u
}

# 選擇 DbContext
select_context() {
    local force_select=${1:-false}
    
    # 如果已經選擇過 Context 且不強制選擇，則直接返回
    if [ -n "$SELECTED_CONTEXT" ] && [ "$force_select" = false ]; then
        CONTEXT_NAME="$SELECTED_CONTEXT"
        return 0
    fi
    
    echo -e "${CYAN}搜尋專案中的 DbContext...${NC}"
    
    # 讀取所有 Context 到陣列
    local contexts=()
    while IFS= read -r line; do
        [ -n "$line" ] && contexts+=("$line")
    done < <(find_all_contexts)
    
    if [ ${#contexts[@]} -eq 0 ]; then
        log_warning "未找到任何 DbContext 檔案"
        read -p "請手動輸入 DbContext 名稱: " CONTEXT_NAME
        SELECTED_CONTEXT="$CONTEXT_NAME"
        return 0
    fi
    
    # 顯示當前選擇
    if [ -n "$SELECTED_CONTEXT" ]; then
        echo -e "${YELLOW}目前選擇: $SELECTED_CONTEXT${NC}"
        echo ""
    fi
    
    echo -e "${CYAN}發現以下 DbContext:${NC}"
    for i in "${!contexts[@]}"; do
        local context="${contexts[i]}"
        if [ "$context" = "$SELECTED_CONTEXT" ]; then
            echo -e "  $((i+1)). ${GREEN}★ $context${NC} (目前選擇)"
        else
            echo -e "  $((i+1)). $context"
        fi
    done
    echo "  0. 手動輸入"
    
    # 如果只有一個 Context 且是第一次選擇，自動選擇
    if [ ${#contexts[@]} -eq 1 ] && [ -z "$SELECTED_CONTEXT" ]; then
        CONTEXT_NAME="${contexts[0]}"
        SELECTED_CONTEXT="$CONTEXT_NAME"
        log_success "自動選擇唯一的 DbContext: $CONTEXT_NAME"
        return 0
    fi
    
    while true; do
        read -p "請選擇 DbContext (輸入編號或名稱): " context_choice
        
        # 檢查是否為數字選擇
        if [[ "$context_choice" =~ ^[0-9]+$ ]]; then
            if [ "$context_choice" -eq 0 ]; then
                read -p "請輸入 DbContext 名稱: " CONTEXT_NAME
                if [ -n "$CONTEXT_NAME" ]; then
                    SELECTED_CONTEXT="$CONTEXT_NAME"
                    log_success "設定 DbContext: $CONTEXT_NAME"
                    break
                else
                    log_error "DbContext 名稱不能為空"
                fi
            elif [ "$context_choice" -ge 1 ] && [ "$context_choice" -le ${#contexts[@]} ]; then
                CONTEXT_NAME="${contexts[$((context_choice-1))]}"
                SELECTED_CONTEXT="$CONTEXT_NAME"
                log_success "選擇 DbContext: $CONTEXT_NAME"
                break
            else
                log_error "無效的選擇，請輸入 0-${#contexts[@]}"
            fi
        else
            # 檢查是否為名稱選擇（不區分大小寫）
            local found=false
            local input_lower=$(echo "$context_choice" | tr '[:upper:]' '[:lower:]')
            
            for context in "${contexts[@]}"; do
                local context_lower=$(echo "$context" | tr '[:upper:]' '[:lower:]')
                if [ "$input_lower" = "$context_lower" ]; then
                    CONTEXT_NAME="$context"
                    SELECTED_CONTEXT="$CONTEXT_NAME"
                    log_success "選擇 DbContext: $CONTEXT_NAME"
                    found=true
                    break
                fi
            done
            
            if [ "$found" = true ]; then
                break
            else
                # 模糊匹配（部分匹配，不區分大小寫）
                local matches=()
                for context in "${contexts[@]}"; do
                    local context_lower=$(echo "$context" | tr '[:upper:]' '[:lower:]')
                    if [[ "$context_lower" == *"$input_lower"* ]]; then
                        matches+=("$context")
                    fi
                done
                
                if [ ${#matches[@]} -eq 1 ]; then
                    CONTEXT_NAME="${matches[0]}"
                    SELECTED_CONTEXT="$CONTEXT_NAME"
                    log_success "找到匹配的 DbContext: $CONTEXT_NAME"
                    break
                elif [ ${#matches[@]} -gt 1 ]; then
                    echo -e "${YELLOW}找到多個匹配項:${NC}"
                    for match in "${matches[@]}"; do
                        echo "  - $match"
                    done
                    log_error "請輸入更精確的名稱或使用編號"
                else
                    log_error "找不到匹配的 DbContext，請重新輸入"
                fi
            fi
        fi
    done
    }

# 建立遷移
Create_Migration() {
    log_info "開始建立遷移..."
    
    get_project_name
    
    # 每次建立遷移時都讓使用者選擇 Context
    echo ""
    echo -e "${YELLOW}請選擇要建立遷移的 DbContext:${NC}"
    select_context true
    
    echo ""
    read -p "請輸入遷移名稱: " migration_name
    
    if [ -z "$migration_name" ]; then
        log_error "遷移名稱不能為空"
        return 1
    fi
    
    # 建構 dotnet ef 指令
    ef_command="dotnet ef migrations add \"$migration_name\""
    
    if [ -n "$CONTEXT_NAME" ]; then
        ef_command="$ef_command --context $CONTEXT_NAME"
    fi
    
    ef_command="$ef_command --output-dir $MIGRATION_PATH"
    
    log_info "執行指令: $ef_command"
    log_info "使用 DbContext: $CONTEXT_NAME"
    
    if eval "$ef_command"; then
        log_success "遷移 '$migration_name' 建立成功"
        log_info "遷移檔案位置: $MIGRATION_PATH"
    else
        log_error "遷移建立失敗"
        return 1
    fi
}

# 更新遷移 (套用到資料庫)
Update_Migration() {
    log_info "開始更新遷移到資料庫..."
    
    get_project_name
    
    # 選擇要更新的 Context
    echo ""
    echo -e "${YELLOW}請選擇要更新的 DbContext:${NC}"
    select_context true
    
    # 顯示可用的遷移
    Get_Migration_List
    
    echo ""
    read -p "請輸入要套用的遷移名稱 (留空表示套用所有未套用的遷移): " target_migration
    
    # 建構 dotnet ef 指令
    ef_command="dotnet ef database update"
    
    if [ -n "$target_migration" ]; then
        ef_command="$ef_command \"$target_migration\""
    fi
    
    if [ -n "$CONTEXT_NAME" ]; then
        ef_command="$ef_command --context $CONTEXT_NAME"
    fi
    
    log_info "執行指令: $ef_command"
    log_info "使用 DbContext: $CONTEXT_NAME"
    
    if eval "$ef_command"; then
        log_success "資料庫更新成功"
    else
        log_error "資料庫更新失敗"
        return 1
    fi
}

# 取得遷移清單
Get_Migration_List() {
    log_info "查詢遷移清單..."
    
    get_project_name
    
    # 如果沒有選擇 Context，先選擇一個
    if [ -z "$CONTEXT_NAME" ]; then
        echo ""
        echo -e "${YELLOW}請選擇要查詢的 DbContext:${NC}"
        select_context true
    fi
    
    # 建構 dotnet ef 指令
    ef_command="dotnet ef migrations list"
    
    if [ -n "$CONTEXT_NAME" ]; then
        ef_command="$ef_command --context $CONTEXT_NAME"
    fi
    
    log_info "執行指令: $ef_command"
    log_info "使用 DbContext: $CONTEXT_NAME"
    
    if eval "$ef_command"; then
        echo ""
        log_info "本地遷移檔案:"
        if [ -d "$MIGRATION_PATH" ]; then
            ls -la "$MIGRATION_PATH"/*.cs 2>/dev/null | awk '{print $9}' | xargs basename -s .cs 2>/dev/null || log_warning "沒有找到遷移檔案"
        else
            log_warning "遷移目錄不存在: $MIGRATION_PATH"
        fi
    else
        log_error "無法取得遷移清單"
        return 1
    fi
}

# 移除遷移
Remove_Migration() {
    log_info "移除最後一個遷移..."
    
    get_project_name
    
    # 選擇要移除遷移的 Context
    echo ""
    echo -e "${YELLOW}請選擇要移除遷移的 DbContext:${NC}"
    select_context true
    
    # 建構 dotnet ef 指令
    ef_command="dotnet ef migrations remove"
    
    if [ -n "$CONTEXT_NAME" ]; then
        ef_command="$ef_command --context $CONTEXT_NAME"
    fi
    
    log_warning "這將移除最後一個遷移檔案"
    log_info "使用 DbContext: $CONTEXT_NAME"
    read -p "確定要繼續嗎? (y/n): " confirm
    
    if [ "$confirm" == "y" ] || [ "$confirm" == "Y" ]; then
        log_info "執行指令: $ef_command"
        
        if eval "$ef_command"; then
            log_success "遷移移除成功"
        else
            log_error "遷移移除失敗"
            return 1
        fi
    else
        log_info "取消移除操作"
    fi
}

# 切換 DbContext
Switch_Context() {
    echo ""
    echo -e "${CYAN}目前使用的 DbContext: ${YELLOW}${SELECTED_CONTEXT:-未選擇}${NC}"
    echo ""
    echo -e "${YELLOW}選擇新的 DbContext:${NC}"
    select_context true
    log_success "已切換到 DbContext: $CONTEXT_NAME"
}

# 檢查 Entity Framework 工具
check_ef_tools() {
    log_info "檢查 Entity Framework 工具..."
    
    if ! command -v dotnet &> /dev/null; then
        log_error ".NET CLI 未安裝"
        exit 1
    fi
    
    if ! dotnet tool list -g | grep -q "dotnet-ef"; then
        log_warning "Entity Framework 工具未安裝"
        read -p "是否要安裝 EF 工具? (y/n): " install_ef
        
        if [ "$install_ef" == "y" ] || [ "$install_ef" == "Y" ]; then
            log_info "安裝 Entity Framework 工具..."
            dotnet tool install --global dotnet-ef
        else
            log_error "需要安裝 Entity Framework 工具才能繼續"
            exit 1
        fi
    fi
    
    log_success "Entity Framework 工具已就緒"
}

# 顯示當前設定
show_current_settings() {
    echo ""
    echo -e "${CYAN}=== 當前設定 ===${NC}"
    echo -e "專案名稱: ${YELLOW}${PROJECT_NAME:-未設定}${NC}"
    echo -e "專案路徑: ${YELLOW}${PROJECT_PATH}${NC}"
    echo -e "選擇的 DbContext: ${YELLOW}${SELECTED_CONTEXT:-未選擇}${NC}"
    echo -e "Migration 路徑: ${YELLOW}${MIGRATION_PATH}${NC}"
    echo ""
}

# 主選單
show_menu() {
    show_current_settings
    echo "=================================================="
    echo "          C# Migration 管理腳本"
    echo "=================================================="
    echo "1. 建立遷移"
    echo "2. 更新遷移"
    echo "3. 查詢遷移清單"
    echo "4. 切換 DbContext"
    echo "5. 移除遷移"
    echo "6. 檢查工具"
    echo "7. 顯示所有 DbContext"
    echo "0. 離開"
    echo "=================================================="
}

# 顯示所有 DbContext
Show_All_Contexts() {
    echo ""
    echo -e "${CYAN}=== 專案中的所有 DbContext ===${NC}"
    
    # 除錯訊息
    log_debug "開始搜尋 DbContext..."
    
    # 顯示搜尋過程
    echo -e "${PURPLE}[除錯] 搜尋檔名包含 context 的檔案 (不區分大小寫):${NC}"
    find . -iname "*context*.cs" -type f 2>/dev/null | while read -r file; do
        echo "  找到: $file"
    done
    
    echo -e "${PURPLE}[除錯] 搜尋繼承 DbContext 的檔案:${NC}"
    find . -name "*.cs" -type f -exec grep -l "class.*:.*DbContext\|class.*:.*IdentityDbContext" {} \; 2>/dev/null | while read -r file; do
        echo "  找到: $file"
        # 顯示相關行
        grep "class.*:.*DbContext\|class.*:.*IdentityDbContext" "$file" | head -1 | sed 's/^/    /'
    done
    
    echo ""
    echo -e "${CYAN}整理後的 DbContext 列表:${NC}"
    
    local contexts=()
    while IFS= read -r line; do
        [ -n "$line" ] && contexts+=("$line")
    done < <(find_all_contexts)
    
    if [ ${#contexts[@]} -eq 0 ]; then
        log_warning "未找到任何 DbContext 檔案"
    else
        for context in "${contexts[@]}"; do
            if [ "$context" == "$SELECTED_CONTEXT" ]; then
                echo -e "  ${GREEN}★ $context${NC} (目前選擇)"
            else
                echo -e "  - $context"
            fi
        done
    fi
    echo ""
}

# 主程式
main() {
    # 初始化
    init_directories
    check_dotnet_project
    check_ef_tools
    get_project_name
    
    # 啟動時選擇預設 DbContext
    echo ""
    echo -e "${CYAN}歡迎使用 C# Migration 管理腳本${NC}"
    echo -e "${YELLOW}請先選擇預設的 DbContext (可以隨時切換):${NC}"
    select_context true
    
    while true; do
        show_menu
        read -p "請選擇功能 (0-7): " choice
        
        case $choice in
            1)
                Create_Migration
                ;;
            2)
                Update_Migration
                ;;
            3)
                Get_Migration_List
                ;;
            4)
                Switch_Context
                ;;
            5)
                Remove_Migration
                ;;
            6)
                check_ef_tools
                ;;
            7)
                Show_All_Contexts
                ;;
            0)
                log_info "感謝使用！"
                exit 0
                ;;
            *)
                log_error "無效的選擇，請輸入 0-7"
                ;;
        esac
        
        echo ""
        read -p "按 Enter 繼續..."
    done
}

main "$@"