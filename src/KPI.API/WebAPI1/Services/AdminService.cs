using System.ComponentModel.DataAnnotations;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel;
using NPOI.SS.Util;
using NPOI.XSSF.UserModel;
using WebAPI1.Context;
using WebAPI1.Controllers;
using WebAPI1.Entities;
using WebAPI1.Services;

public record OrgTreeNodeDto(
    int Id, string Name, string TypeCode, bool IsActive,
    string? Code, string? Address, string? ContactPerson, string? ContactPhone,
    string? TaxId,
    List<OrgTreeNodeDto> Children
);

public record OrgUpsertDto(
    string Name, int TypeId, int? ParentId,
    string? Code, string? Address, string? ContactPerson, string? ContactPhone,
    string? TaxId, bool IsActive, bool UseParentDomainVerification
);
public record MoveParentDto(int? NewParentId);
public class UserListQueryDto
{
    public string? Q { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
    public int? OrganizationId { get; set; }
    public int Page { get; set; } = 1;      // 1-based
    public int PageSize { get; set; } = 20;
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public record UserListItemDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = "";             // Nickname 優先，否則 Username
    public string Account { get; init; } = "";          // Username
    public string? Email { get; init; }
    public string[] Roles { get; init; } = Array.Empty<string>();
    public string? Unit { get; init; }
    public string? OrganizationName { get; init; }
    public string Status { get; init; } = "active";     // active | pending | disabled
    public DateTime? LastLoginAt { get; init; }
    public bool EmailVerified { get; init; }
    public bool IsLocked { get; init; }
    public DateTime? LockedUntil { get; init; }
    public int FailedAttempts { get; init; }
    public bool FormaRegistered { get; init; }
}

public record CreateUserDto
{
    [Required, MaxLength(25)] public string Username { get; init; } = "";
    [Required, MaxLength(50)] public string Name { get; init; } = ""; // 對應 Nickname
    public string? Email { get; init; }
    public string? Mobile { get; init; }
    public string? Unit { get; init; }
    public string? Position { get; init; }
    public int OrganizationId { get; init; }
    public bool IsActive { get; init; } = true;
    public string[] Roles { get; init; } = Array.Empty<string>(); // 以角色「名稱」指定
    public string? Password { get; init; } // 若需要初始密碼
}

public record UpdateUserDto2
{
    [Required, MaxLength(50)] public string Name { get; init; } = "";
    public string? Email { get; init; }
    public string? Mobile { get; init; }
    public string? Unit { get; init; }
    public string? Position { get; init; }
    public int OrganizationId { get; init; }
    public bool IsActive { get; init; } = true;
}

public record UserDetailDto
{
    public Guid Id { get; init; }
    public string Username { get; init; } = "";
    public string? Nickname { get; init; }
    public string? Email { get; init; }
    public string? Mobile { get; init; }
    public string? Unit { get; init; }
    public string? Position { get; init; }
    public string? OrganizationName { get; init; }
    public string[] Roles { get; init; } = Array.Empty<string>();
    public bool IsActive { get; init; }
    public bool EmailVerified { get; init; }
    public DateTime? EmailVerifiedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
    public DateTime? PasswordChangedAt { get; init; }
    public bool ForceChangePassword { get; init; }
    public bool IsLocked { get; init; }
    public DateTime? LockedUntil { get; init; }
    public int FailedAttempts { get; init; }
    public bool FormaRegistered { get; init; }
}

public record SetRolesDto(string[] Roles);
public record SetActiveDto(bool IsActive);

public record PermRowDto
{
    public string Key { get; init; } = string.Empty;   // permission.Key
    public string Label { get; init; } = string.Empty; // 對應 Permission.Description（沒有就回填 Key）
    public Dictionary<string, bool> Grants { get; init; } = new(); // roleName -> allow
}

public record PermissionMatrixDto
{
    public string[] Roles { get; init; } = Array.Empty<string>(); // 角色名稱陣列（用於前端表頭順序）
    public List<PermRowDto> Rows { get; init; } = new();
}

public record UpsertPermissionDto
{
    public string Key { get; init; } = string.Empty;
    public string? Label { get; init; }  // 對應 Permission.Description
}

public record SavePermissionMatrixRequest
{
    public List<PermRowDto> Rows { get; init; } = new();
}

// KpiField
public record KpiFieldDto(int Id, string Field, string EnField);
public record KpiFieldUpsertDto([Required, StringLength(50)] string Field,
                                [Required, StringLength(50)] string EnField);

// KpiItem（清單列）
public record KpiItemRowDto(
    int Id, int IndicatorNumber, int KpiCategoryId, int KpiFieldId, string KpiFieldName,
    int? OrganizationId, string? OrganizationName,
    string DisplayName, // 取當前年份命中的 Name（或最新的）
    int DetailCount, DateTime CreateTime);

// KpiItem（詳情）
public record KpiItemDetailDto(
    int Id, int IndicatorNumber, int KpiCategoryId, int KpiFieldId,
    int? OrganizationId, string? OrganizationName,
    List<KpiItemNameDto> Names,
    List<KpiDetailItemDto> DetailItems,
    DateTime CreateTime, DateTime UploadTime);

public record KpiItemUpsertDto(
    int IndicatorNumber, int KpiCategoryId, int KpiFieldId, int? OrganizationId);

public record KpiItemNameDto(int Id, int KpiItemId, string Name, int StartYear, int? EndYear, string UserEmail);
public record KpiItemNameUpsertDto([Required] string Name, int StartYear, int? EndYear);

// KpiDetailItem
public record KpiDetailItemDto(
    int Id, int KpiItemId, string Unit, string? ComparisonOperator, bool IsIndicator,
    List<KpiDetailItemNameDto> Names);

public record KpiDetailItemUpsertDto(
    [Required, StringLength(50)] string Unit,
    [StringLength(3)] string? ComparisonOperator,
    bool IsIndicator);

public record KpiDetailItemNameDto(int Id, int KpiDetailItemId, string Name, int StartYear, int? EndYear, string UserEmail);
public record KpiDetailItemNameUpsertDto([Required] string Name, int StartYear, int? EndYear);

// KpiDetailItemMappingGroup（一次政策修訂計畫，底下掛多筆新舊指標對照）
// OldDetailItemId/NewDetailItemId 為 null 代表「不限定細項」，涵蓋該指標項目底下全部細項
public record KpiDetailItemMappingDto(
    int Id, int GroupId,
    int OldKpiItemId, string? OldIndicatorName,
    int NewKpiItemId, string? NewIndicatorName,
    int? OldDetailItemId, string? OldDetailItemName,
    int? NewDetailItemId, string? NewDetailItemName);

public record KpiDetailItemMappingUpsertDto(
    int OldKpiItemId, int NewKpiItemId,
    int? OldDetailItemId, int? NewDetailItemId);

public record KpiDetailItemMappingGroupDto(
    int Id, string Name, int EffectiveYear, string? Note,
    string CreatedByEmail, DateTime CreatedAt,
    List<KpiDetailItemMappingDto> Mappings);

public record KpiDetailItemMappingGroupUpsertDto(
    [Required, StringLength(200)] string Name,
    [Range(1900, 3000)] int EffectiveYear,
    string? Note);

// ReportPeriodSetting（目前開放填報的年度/季度＋是否鎖定）
public record ReportPeriodSettingDto(
    int CurrentYear, string CurrentQuarter, bool IsLocked,
    string? UpdatedByEmail, DateTime? UpdatedAt);

public record ReportPeriodSettingUpsertDto(
    [Range(1900, 3000)] int CurrentYear,
    [Required, StringLength(10)] string CurrentQuarter,
    bool IsLocked);

// KpiData（基線/目標）
public record KpiDataDto(
    int Id, bool IsApplied, string BaselineYear, decimal? BaselineValue,
    decimal? TargetValue, string? Remarks, int DetailItemId, int? KpiCycleId,
    int? OrganizationId, string? ProductionSite);

// KpiData 週期校正清單
public record KpiDataListItemDto(
    int Id,
    int? OrganizationId, string? OrganizationName,
    int? KpiCycleId, string? CycleName,
    string Field, int IndicatorNumber, string ItemName, string DetailItemName,
    string Unit, string? ProductionSite,
    string BaselineYear, decimal? BaselineValue, decimal? TargetValue,
    int ReportCount);

public record KpiDataUpsertDto(
    bool IsApplied,
    [Required, StringLength(20)] string BaselineYear,
    decimal? BaselineValue, decimal? TargetValue,
    string? Remarks, int DetailItemId, int? KpiCycleId, int? OrganizationId,
    string? ProductionSite);

// KpiReport 期別搬移
public record PeriodMovePreviewItem(int OrganizationId, string OrgName, int ReportCount);

// KpiReport
public record KpiReportAdminDto(
    int Id, int Year, string Period, decimal? KpiReportValue,
    bool IsSkipped, string? Remarks, byte Status, int KpiDataId);

public record KpiReportUpsertDto(
    [Range(1900, 3000)] int Year,
    [Required, StringLength(4)] string Period, // Q1/Q2/Q3/Q4/H1/Y
    decimal? KpiReportValue,
    bool IsSkipped,
    string? Remarks);

//kpiCycle
public record KpiCycleDto(int Id, string Name, int StartYear, int EndYear);
public record KpiCycleUpsertDto(
    [Required, StringLength(50)] string Name,
    [Range(1900, 3000)] int StartYear,
    [Range(1900, 3000)] int EndYear
);

// 下拉用：會議/活動類別
public record SuggestEventTypeDto(int Id, string Name);

// 下拉用：建議類別
public record SuggestionTypeDto(int Id, string Name);

// Enum 封裝（IsAdopted）
public record IsAdoptedOption(byte Value, string Name);

// 督導主檔（SuggestDate）
public record SuggestDateRowDto(
    int Id,
    DateTime Date,
    int SuggestEventTypeId,
    string SuggestEventTypeName,
    int? OrganizationId,
    string? OrganizationName,
    int ReportsCount,
    DateTime? CreatedAt);

public record SuggestDateDetailDto(
    int Id,
    DateTime Date,
    int SuggestEventTypeId,
    string SuggestEventTypeName,
    int? OrganizationId,
    string? OrganizationName,
    List<SuggestReportRowDto> Reports,
    DateTime? CreatedAt,
    DateTime? UpdateAt);

public record SuggestDateUpsertDto(
    [Required] DateTime Date,
    [Required] int SuggestEventTypeId,
    int? OrganizationId);

// 建議報告（SuggestReport）
public record SuggestReportRowDto(
    int Id,
    int SuggestDateId,
    int SuggestionTypeId,
    string SuggestionTypeName,
    string SuggestionContent,
    byte? IsAdopted,           // 對應 Enum IsAdopted
    string? IsAdoptedOther,
    string? RespDept,
    string? ImproveDetails,
    int? Manpower,
    decimal? Budget,
    byte? Completed,           // 對應 Enum IsAdopted
    string? CompletedOther,
    int? DoneYear,
    int? DoneMonth,
    byte? ParallelExec,        // 對應 Enum IsAdopted
    string? ParallelExecOther,
    string? ExecPlan,
    string? Remark,
    int? KpiFieldId,
    string? KpiFieldName,
    Guid UserId,
    string? UserName,
    DateTime? CreatedAt,
    DateTime? UpdateAt);

public record SuggestReportUpsertDto(
    [Required] int SuggestionTypeId,
    [Required] string SuggestionContent,
    byte? IsAdopted,
    string? IsAdoptedOther,
    string? RespDept,
    string? ImproveDetails,
    int? Manpower,
    decimal? Budget,
    byte? Completed,
    string? CompletedOther,
    int? DoneYear,
    int? DoneMonth,
    byte? ParallelExec,
    string? ParallelExecOther,
    string? ExecPlan,
    string? Remark,
    int? KpiFieldId);

// OrganizationDomain
public record OrgDomainDto(
    int Id, int OrganizationId, string OrganizationName,
    string DomainName, string? Description,
    bool IsPrimary, bool IsSharedWithChildren,
    int Priority, bool IsActive,
    DateTime? VerifiedAt, DateTime CreatedAt);

public record OrgDomainUpsertDto(
    int OrganizationId, string DomainName, string? Description,
    bool IsPrimary, bool IsSharedWithChildren,
    int Priority, bool IsActive);

// KPI 審核用 DTO
public record KpiReportReviewDto(
    int Id,
    int KpiDataId,
    int? OrganizationId,
    string? OrganizationName,
    string? IndicatorNumber,
    string? IndicatorName,
    string? DetailItemName,
    string? Field,
    int Year,
    string Period,
    decimal? Value,
    bool IsSkipped,
    string? Remarks,
    string Status,
    DateTime? CreatedAt,
    DateTime? UpdateAt
);

public interface IAdminService
{
    Task<PermissionMatrixDto> GetMatrixAsync(CancellationToken ct = default);
    Task UpsertPermissionAsync(UpsertPermissionDto dto, CancellationToken ct = default);
    Task DeletePermissionAsync(string key, CancellationToken ct = default);
    Task SaveMatrixAsync(SavePermissionMatrixRequest req, CancellationToken ct = default);
    
    // ===== 新增：角色管理 ===== 
    Task<string[]> GetRolesAsync(CancellationToken ct = default);
    Task CreateRoleAsync(string name, CancellationToken ct = default);
    Task RenameRoleAsync(string oldName, string newName, CancellationToken ct = default);
    Task DeleteRoleAsync(string name, CancellationToken ct = default);
    
    // ===== 新增：使用者管理 =====
    Task<UserDetailDto?> GetUserDetailAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<UserListItemDto>> SearchUsersAsync(UserListQueryDto query, CancellationToken ct = default);
    Task UpdateUserAsync(Guid id, UpdateUserDto2 dto, CancellationToken ct = default);
    Task DeleteUserAsync(Guid id, CancellationToken ct = default);
    Task SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);
    Task SetEmailVerifiedAsync(Guid id, bool emailVerified, CancellationToken ct = default);
    Task UnlockAccountAsync(Guid id, CancellationToken ct = default);
    Task SetRolesAsync(Guid id, string[] roles, CancellationToken ct = default);
    Task SetOrganizationAsync(Guid id, int organizationId, CancellationToken ct = default);
    Task ProvisionFormaAsync(Guid userId, CancellationToken ct = default);
    Task<int> SyncFormaUsersAsync(CancellationToken ct = default);

    // ===== 新增：日誌管理 =====
    Task<PagedResult<DataChangeLog>> GetLogsAsync(string? q, int page, int pageSize, CancellationToken ct = default);
    
    // ===== 組織管理 =====
    Task<List<OrgTreeNodeDto>> GetOrgTreeAsync(CancellationToken ct);
    Task<Organization?> GetOrgAsync(int id, CancellationToken ct);
    Task<int> CreateOrgAsync(OrgUpsertDto dto, CancellationToken ct);
    Task UpdateOrgAsync(int id, OrgUpsertDto dto, CancellationToken ct);
    Task MoveOrgAsync(int id, int? newParentId, CancellationToken ct);
    Task DeleteOrgAsync(int id, CancellationToken ct);
    
    // === 組織「類型」 ===
    Task<List<AdminController.OrgTypeDto>> GetOrgTypesAsync(CancellationToken ct);
    Task<int> CreateOrgTypeAsync(AdminController.OrgTypeUpsertDto dto, CancellationToken ct);
    Task UpdateOrgTypeAsync(int id, AdminController.OrgTypeUpsertDto dto, CancellationToken ct);
    Task DeleteOrgTypeAsync(int id, CancellationToken ct);

    // === 組織「階層規則」 ===
    Task<List<AdminController.HierRuleDto>> GetHierarchyRulesAsync(CancellationToken ct);
    Task<int> CreateHierarchyRuleAsync(AdminController.HierRuleUpsertDto dto, CancellationToken ct);
    Task UpdateHierarchyRuleAsync(int id, AdminController.HierRuleUpsertDto dto, CancellationToken ct);
    Task DeleteHierarchyRuleAsync(int id, CancellationToken ct);

    // === 組織「網域」 ===
    Task<List<OrgDomainDto>> GetOrgDomainsAsync(int? orgId, CancellationToken ct);
    Task<OrgDomainDto?> GetOrgDomainAsync(int id, CancellationToken ct);
    Task<int> CreateOrgDomainAsync(OrgDomainUpsertDto dto, CancellationToken ct);
    Task UpdateOrgDomainAsync(int id, OrgDomainUpsertDto dto, CancellationToken ct);
    Task DeleteOrgDomainAsync(int id, CancellationToken ct);

    // === KPI ===
    // Fields
    Task<IEnumerable<KpiFieldDto>> GetFieldsAsync(CancellationToken ct);
    Task<int> CreateFieldAsync(KpiFieldUpsertDto dto, CancellationToken ct);
    Task UpdateFieldAsync(int id, KpiFieldUpsertDto dto, CancellationToken ct);
    Task DeleteFieldAsync(int id, CancellationToken ct);

    // Items
    Task<PagedResult<KpiItemRowDto>> SearchItemsAsync(int page, int pageSize, int? fieldId, int? category, int? orgId, string? q, CancellationToken ct);
    Task<KpiItemDetailDto> GetItemAsync(int id, CancellationToken ct);
    Task<int> CreateItemAsync(KpiItemUpsertDto dto, CancellationToken ct);
    Task UpdateItemAsync(int id, KpiItemUpsertDto dto, CancellationToken ct);
    Task DeleteItemAsync(int id, CancellationToken ct);

    // Names
    Task AddItemNameAsync(int itemId, KpiItemNameUpsertDto dto, string userEmail, CancellationToken ct);
    Task UpdateItemNameAsync(int itemId, int nameId, KpiItemNameUpsertDto dto, CancellationToken ct);
    Task DeleteItemNameAsync(int itemId, int nameId, CancellationToken ct);

    // Detail Items
    Task<int> AddDetailItemAsync(int itemId, KpiDetailItemUpsertDto dto, CancellationToken ct);
    Task UpdateDetailItemAsync(int detailId, KpiDetailItemUpsertDto dto, CancellationToken ct);
    Task DeleteDetailItemAsync(int detailId, CancellationToken ct);

    // Detail Names
    Task AddDetailItemNameAsync(int detailId, KpiDetailItemNameUpsertDto dto, string userEmail, CancellationToken ct);
    Task UpdateDetailItemNameAsync(int detailId, int nameId, KpiDetailItemNameUpsertDto dto, CancellationToken ct);
    Task DeleteDetailItemNameAsync(int detailId, int nameId, CancellationToken ct);
    Task<IEnumerable<KpiDetailItemMappingGroupDto>> GetDetailItemMappingGroupsAsync(CancellationToken ct);
    Task<int> CreateDetailItemMappingGroupAsync(KpiDetailItemMappingGroupUpsertDto dto, string userEmail, CancellationToken ct);
    Task UpdateDetailItemMappingGroupAsync(int groupId, KpiDetailItemMappingGroupUpsertDto dto, CancellationToken ct);
    Task DeleteDetailItemMappingGroupAsync(int groupId, CancellationToken ct);
    Task<int> AddDetailItemMappingAsync(int groupId, KpiDetailItemMappingUpsertDto dto, CancellationToken ct);
    Task UpdateDetailItemMappingAsync(int mappingId, KpiDetailItemMappingUpsertDto dto, CancellationToken ct);
    Task DeleteDetailItemMappingAsync(int id, CancellationToken ct);
    Task<ReportPeriodSettingDto> GetReportPeriodSettingAsync(CancellationToken ct);
    Task UpdateReportPeriodSettingAsync(ReportPeriodSettingUpsertDto dto, string userEmail, CancellationToken ct);

    // KpiData
    Task<IEnumerable<KpiDataDto>> ListKpiDataAsync(int detailId, CancellationToken ct);
    Task<int> AddKpiDataAsync(int detailId, KpiDataUpsertDto dto, CancellationToken ct);
    Task UpdateKpiDataAsync(int dataId, KpiDataUpsertDto dto, CancellationToken ct);
    Task DeleteKpiDataAsync(int dataId, CancellationToken ct);

    // Reports
    Task<IEnumerable<KpiReportAdminDto>> ListReportsAsync(int dataId, CancellationToken ct);
    Task<int> AddReportAsync(int dataId, KpiReportUpsertDto dto, CancellationToken ct);
    Task UpdateReportAsync(int reportId, KpiReportUpsertDto dto, CancellationToken ct);
    Task DeleteReportAsync(int reportId, CancellationToken ct);
    Task ChangeReportStatusAsync(int reportId, byte newStatus, CancellationToken ct);
    Task BatchChangeReportStatusAsync(IEnumerable<int> ids, byte newStatus, CancellationToken ct);
    Task<PagedResult<KpiReportReviewDto>> GetKpiReportsForReviewAsync(byte? status, int? organizationId, string? orgName, string? field, int? year, string? period, int page, int pageSize, CancellationToken ct);
    Task<int> BatchRevokeFinalizedAsync(int year, string period, int? organizationId, CancellationToken ct);
    Task<IEnumerable<PeriodMovePreviewItem>> GetPeriodMovePreviewAsync(int srcYear, string srcPeriod, CancellationToken ct);
    Task<int> MovePeriodAsync(int srcYear, string srcPeriod, int dstYear, string dstPeriod, int[]? orgIds, CancellationToken ct);
    Task<byte[]> ExportKpiHistoryToExcelAsync(int[] orgIds, CancellationToken ct);
    Task<PagedResult<KpiDataListItemDto>> SearchKpiDataForCycleAsync(int? orgId, int? cycleId, bool noChycleOnly, string? q, int page, int pageSize, CancellationToken ct);
    Task<int> BatchReassignCycleAsync(int[] kpiDataIds, int? newCycleId, CancellationToken ct);

    //kpiCycle
    Task<IEnumerable<KpiCycleDto>> ListCyclesAsync(CancellationToken ct);
    Task<int> CreateCycleAsync(KpiCycleUpsertDto dto, CancellationToken ct);
    Task UpdateCycleAsync(int id, KpiCycleUpsertDto dto, CancellationToken ct);
    Task DeleteCycleAsync(int id, CancellationToken ct);

    // === 委員建議 ===
    // 下拉
    Task<List<SuggestEventTypeDto>> ListEventTypesAsync(CancellationToken ct);
    Task<List<SuggestionTypeDto>> ListSuggestionTypesAsync(CancellationToken ct);
    Task<List<IsAdoptedOption>> ListIsAdoptedOptionsAsync();

    // 督導主檔（SuggestDate）
    Task<PagedResult<SuggestDateRowDto>> SearchSuggestDatesAsync(
        int page, int pageSize, int? orgId, int? eventTypeId, int? year, CancellationToken ct);

    Task<SuggestDateDetailDto> GetSuggestDateAsync(int id, CancellationToken ct);
    Task<int> CreateSuggestDateAsync(SuggestDateUpsertDto dto, CancellationToken ct);
    Task UpdateSuggestDateAsync(int id, SuggestDateUpsertDto dto, CancellationToken ct);
    Task DeleteSuggestDateAsync(int id, CancellationToken ct);

    // 建議報告（SuggestReport）
    Task<List<SuggestReportRowDto>> ListReportsByDateAsync(int suggestDateId, CancellationToken ct);
    Task<SuggestReportRowDto> GetReportAsync(int id, CancellationToken ct);
    Task<int> CreateReportAsync(int suggestDateId, SuggestReportUpsertDto dto, Guid userId, CancellationToken ct);
    Task UpdateReportAsync(int id, SuggestReportUpsertDto dto, CancellationToken ct);

    // 跨日期查詢（可做儀表板/統計）
    Task<PagedResult<SuggestReportRowDto>> SearchReportsAsync(
        int page, int pageSize, int? orgId, int? suggestionTypeId, int? kpiFieldId, int? year, string? q, CancellationToken ct);
}

public class AdminService: IAdminService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ISHAuditDbcontext _context;
    private readonly ILogger<AdminService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public AdminService(IConfiguration configuration, IHttpContextAccessor httpContextAccessor, ISHAuditDbcontext context, ILogger<AdminService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }
    
    public async Task<PermissionMatrixDto> GetMatrixAsync(CancellationToken ct = default)
    {
        // 1) 取角色（依名稱排序，讓前端表頭穩定）
        var roles = await _context.Roles
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(ct);

        // 2) 取權限與關聯
        var perms = await _context.Permissions
            .OrderBy(p => p.Key)
            .ToListAsync(ct);

        var rp = await _context.RolePermissions
            .AsNoTracking()
            .ToListAsync(ct);

        // 3) 組矩陣
        var rows = new List<PermRowDto>(perms.Count);
        var roleIdByName = roles.ToDictionary(r => r.Name, r => r.Id);

        var rpSet = rp.ToHashSet(new RolePermissionComparer());

        foreach (var p in perms)
        {
            var grants = new Dictionary<string, bool>(roles.Count);
            foreach (var role in roles)
            {
                var allow = rpSet.Contains(new RolePermission { RoleId = role.Id, PermissionId = p.Id });
                grants[role.Name] = allow;
            }

            rows.Add(new PermRowDto
            {
                Key = p.Key,
                Label = string.IsNullOrWhiteSpace(p.Description) ? p.Key : p.Description!,
                Grants = grants
            });
        }

        return new PermissionMatrixDto
        {
            Roles = roles.Select(r => r.Name).ToArray(),
            Rows = rows
        };
    }

    public async Task UpsertPermissionAsync(UpsertPermissionDto dto, CancellationToken ct = default)
    {
        var key = (dto.Key ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Key 不可為空白。");

        var entity = await _context.Permissions.FirstOrDefaultAsync(p => p.Key == key, ct);
        if (entity == null)
        {
            entity = new Permission
            {
                Key = key,
                Description = dto.Label
            };
            _context.Permissions.Add(entity);
        }
        else
        {
            // 僅更新描述（Label）
            if (!string.Equals(entity.Description, dto.Label, StringComparison.Ordinal))
                entity.Description = dto.Label;
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeletePermissionAsync(string key, CancellationToken ct = default)
    {
        var entity = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Key == key, ct);

        if (entity == null) return;

        _context.Permissions.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task SaveMatrixAsync(SavePermissionMatrixRequest req, CancellationToken ct = default)
    {
        // 將前端 rows 差異化套用到 RolePermission（並同步 upsert Permission 的描述）
        using var tx = await _context.Database.BeginTransactionAsync(ct);

        // 1) 角色快取
        var roles = await _context.Roles
            .Select(r => new { r.Id, r.Name })
            .ToListAsync(ct);

        var roleByName = roles.ToDictionary(r => r.Name, r => r.Id);

        // 2) 權限快取（依 key）
        var allKeys = req.Rows.Select(r => r.Key.Trim()).Where(k => !string.IsNullOrEmpty(k)).Distinct().ToList();

        var existingPerms = await _context.Permissions
            .Where(p => allKeys.Contains(p.Key))
            .ToListAsync(ct);

        var permByKey = existingPerms.ToDictionary(p => p.Key, p => p);

        // 建立缺少的 Permission
        foreach (var row in req.Rows)
        {
            var key = row.Key.Trim();
            if (string.IsNullOrEmpty(key)) continue;

            if (!permByKey.TryGetValue(key, out var perm))
            {
                perm = new Permission
                {
                    Key = key,
                    Description = string.IsNullOrWhiteSpace(row.Label) ? key : row.Label
                };
                _context.Permissions.Add(perm);
                permByKey[key] = perm;
            }
            else
            {
                // 同步描述
                var desc = string.IsNullOrWhiteSpace(row.Label) ? perm.Key : row.Label;
                if (!string.Equals(perm.Description, desc, StringComparison.Ordinal))
                    perm.Description = desc;
            }
        }

        await _context.SaveChangesAsync(ct); // 確保有 Id

        // 3) 取出這批涉及到的 RolePermission 現況
        var permIds = permByKey.Values.Select(p => p.Id).ToList();

        var existingRps = await _context.RolePermissions
            .Where(rp => permIds.Contains(rp.PermissionId))
            .ToListAsync(ct);

        var existingSet = existingRps.ToHashSet(new RolePermissionComparer());

        // 4) 建立「期望集合」
        var desiredSet = new HashSet<RolePermission>(new RolePermissionComparer());
        foreach (var row in req.Rows)
        {
            if (!permByKey.TryGetValue(row.Key.Trim(), out var perm)) continue;

            foreach (var kv in row.Grants)
            {
                if (!roleByName.TryGetValue(kv.Key, out var roleId)) continue;
                if (kv.Value)
                {
                    desiredSet.Add(new RolePermission
                    {
                        RoleId = roleId,
                        PermissionId = perm.Id
                    });
                }
            }
        }

        // 5) 計算差異
        var toAdd = desiredSet.Except(existingSet, new RolePermissionComparer()).ToList();
        var toRemove = existingSet.Except(desiredSet, new RolePermissionComparer()).ToList();

        if (toAdd.Count > 0)
            await _context.RolePermissions.AddRangeAsync(toAdd, ct);

        if (toRemove.Count > 0)
            _context.RolePermissions.RemoveRange(toRemove);

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    // ========== 角色管理 ==========
    public async Task<string[]> GetRolesAsync(CancellationToken ct = default)
    {
        return await _context.Roles
            .OrderBy(r => r.Name)
            .Select(r => r.Name)
            .ToArrayAsync(ct);
    }

    public async Task CreateRoleAsync(string name, CancellationToken ct = default)
    {
        var n = (name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(n)) throw new ArgumentException("角色名稱不可空白");

        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == n.ToLower(), ct);
        if (exists) throw new InvalidOperationException("角色已存在");

        _context.Roles.Add(new Role { Name = n });
        await _context.SaveChangesAsync(ct);
    }

    public async Task RenameRoleAsync(string oldName, string newName, CancellationToken ct = default)
    {
        var o = (oldName ?? string.Empty).Trim();
        var n = (newName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(o) || string.IsNullOrWhiteSpace(n))
            throw new ArgumentException("角色名稱不可空白");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == o.ToLower(), ct);
        if (role is null) throw new KeyNotFoundException("欲更名的角色不存在");

        var conflict = await _context.Roles.AnyAsync(r => r.Id != role.Id && r.Name.ToLower() == n.ToLower(), ct);
        if (conflict) throw new InvalidOperationException("新角色名稱已被使用");

        role.Name = n;
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteRoleAsync(string name, CancellationToken ct = default)
    {
        var n = (name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(n)) return;

        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Name.ToLower() == n.ToLower(), ct);
        if (role is null) return;

        // 若 FK 設定為 Cascade，直接移除 Role 即可；否則先清 RolePermissions
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(ct);
    }
    
    private sealed class RolePermissionComparer : IEqualityComparer<RolePermission>
    {
        public bool Equals(RolePermission? x, RolePermission? y)
            => x?.RoleId == y?.RoleId && x?.PermissionId == y?.PermissionId;

        public int GetHashCode(RolePermission obj)
            => HashCode.Combine(obj.RoleId, obj.PermissionId);
    }
    
    // 取得使用者詳情
    public async Task<UserDetailDto?> GetUserDetailAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Organization)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return null;

        var nowUtc = DateTime.UtcNow;
        return new UserDetailDto
        {
            Id = user.Id,
            Username = user.Username,
            Nickname = user.Nickname,
            Email = user.Email,
            Mobile = user.Mobile,
            Unit = user.Unit,
            Position = user.Position,
            OrganizationName = user.Organization?.Name,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToArray(),
            IsActive = user.IsActive,
            EmailVerified = user.EmailVerified,
            EmailVerifiedAt = user.EmailVerifiedAt,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            PasswordChangedAt = user.PasswordChangedAt,
            ForceChangePassword = user.ForceChangePassword,
            IsLocked = user.PasswordLockedUntil.HasValue && user.PasswordLockedUntil.Value > nowUtc,
            LockedUntil = user.PasswordLockedUntil,
            FailedAttempts = user.PasswordFailedAttempts,
            FormaRegistered = user.FormaRegistered,
        };
    }

    // 查詢使用者清單
    public async Task<PagedResult<UserListItemDto>> SearchUsersAsync(UserListQueryDto query, CancellationToken ct = default)
    {
        _logger.LogInformation("SearchUsers Q='{Q}', Role='{Role}', Status='{Status}', OrgId='{OrgId}'", query.Q, query.Role, query.Status, query.OrganizationId);
        var page = Math.Max(1, query.Page);
        IQueryable<User> q = _context.Users.AsNoTracking();
        q = q.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
             .Include(u => u.Organization);

        // 1️⃣ 關鍵字搜尋 (使用者名稱、暱稱、單位)
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var kw = query.Q.Trim();
            q = q.Where(u =>
                u.Username.Contains(kw) ||
                (u.Nickname ?? "").Contains(kw) ||
                (u.Unit ?? "").Contains(kw));
        }

        // 2️⃣ 角色篩選 ✅ 新增
        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            var roleName = query.Role.Trim();
            q = q.Where(u => u.UserRoles.Any(ur => ur.Role.Name.Contains(roleName)));
        }

        // 3️⃣ 機構篩選
        if (query.OrganizationId.HasValue)
        {
            q = q.Where(u => u.OrganizationId == query.OrganizationId.Value);
        }

        // 4️⃣ 狀態篩選
        var now = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            switch (query.Status.ToLower())
            {
                case "active":
                    q = q.Where(u => u.IsActive && u.EmailVerified);
                    break;
                case "pending":
                    q = q.Where(u => u.IsActive && !u.EmailVerified);
                    break;
                case "disabled":
                    q = q.Where(u => !u.IsActive);
                    break;
                case "locked":
                    q = q.Where(u => u.PasswordLockedUntil != null && u.PasswordLockedUntil > now);
                    break;
            }
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(u => u.UpdatedAt)
            .Skip((page - 1) * query.PageSize)  // ✅ 修正：使用 page 變數
            .Take(query.PageSize)
            .Select(u => new UserListItemDto
            {
                Id = u.Id,
                Name = string.IsNullOrWhiteSpace(u.Nickname) ? u.Username : u.Nickname!,
                Account = u.Username,
                Email = u.Email,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToArray(),
                Unit = u.Unit,
                OrganizationName = u.Organization != null ? u.Organization.Name : null,
                Status = !u.IsActive ? "disabled" : (!u.EmailVerified ? "pending" : "active"),
                LastLoginAt = u.LastLoginAt,
                EmailVerified = u.EmailVerified,
                IsLocked = u.PasswordLockedUntil != null && u.PasswordLockedUntil > now,
                LockedUntil = u.PasswordLockedUntil,
                FailedAttempts = u.PasswordFailedAttempts,
                FormaRegistered = u.FormaRegistered,
            })
            .ToListAsync(ct);

        return new PagedResult<UserListItemDto>(items, page, query.PageSize, total);
    }

    // 修改使用者基本資料
    public async Task UpdateUserAsync(Guid id, UpdateUserDto2 dto, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        user.Nickname = dto.Name;
        user.Email = dto.Email;
        user.Mobile = dto.Mobile;
        user.Unit = dto.Unit;
        user.Position = dto.Position;
        user.OrganizationId = dto.OrganizationId;
        user.IsActive = dto.IsActive;
        user.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }
    
    // 刪除使用者
    public async Task DeleteUserAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return;

        _context.UserRoles.RemoveRange(user.UserRoles);
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(ct);
    }

    // 啟用/停用
    public async Task SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        user.IsActive = isActive;
        user.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    // Email 驗證狀態
    public async Task SetEmailVerifiedAsync(Guid id, bool emailVerified, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        user.EmailVerified = emailVerified;
        user.EmailVerifiedAt = emailVerified ? DateTime.UtcNow : null;
        user.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    // 解除帳號鎖定
    public async Task UnlockAccountAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        user.PasswordLockedUntil = null;
        user.PasswordFailedAttempts = 0;
        user.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    // 修改角色
    public async Task SetRolesAsync(Guid id, string[] roles, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        var roleNames = roles.Select(r => r.Trim()).ToArray();
        var validRoles = await _context.Roles.Where(r => roleNames.Contains(r.Name)).ToListAsync(ct);

        _context.UserRoles.RemoveRange(user.UserRoles);
        _context.UserRoles.AddRange(validRoles.Select(r => new UserRole { UserId = id, RoleId = r.Id }));

        await _context.SaveChangesAsync(ct);
    }

    // 變更所屬機構
    public async Task SetOrganizationAsync(Guid id, int organizationId, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        var orgExists = await _context.Organizations.AnyAsync(o => o.Id == organizationId, ct);
        if (!orgExists) throw new ArgumentException("找不到指定的機構");

        user.OrganizationId = organizationId;
        user.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    public async Task ProvisionFormaAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        if (string.IsNullOrEmpty(user.Email))
            throw new InvalidOperationException("使用者未設定 Email，無法開通表單系統");

        if (user.UserRoles.Count == 0)
            throw new InvalidOperationException("使用者尚未指派角色，請先設定角色再開通");

        var isAdmin = user.UserRoles
            .Any(ur => ur.Role.Name.Equals("admin", StringComparison.OrdinalIgnoreCase));

        var formaBaseUrl = _configuration["FormaApiBaseUrl"] ?? "http://forma:8080";
        var secret = _configuration["FormaInternalSecret"] ?? "";
        var username = user.Nickname ?? user.Username;

        using var http = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"{formaBaseUrl}/api/internal/provision");
        request.Headers.Add("X-Internal-Secret", secret);
        var orgName = user.Organization?.Name;
        var department = string.IsNullOrEmpty(orgName)
            ? user.Unit
            : string.IsNullOrEmpty(user.Unit) ? orgName : $"{orgName}-{user.Unit}";

        request.Content = JsonContent.Create(new { email = user.Email, username, isAdmin, unit = department, position = user.Position });

        var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        user.FormaRegistered = true;
        user.UpdatedAt = tool.GetTaiwanNow();
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("ProvisionForma: 已開通 [{Username}] <{Email}> 的表單系統帳號", username, user.Email);
    }

    public async Task<int> SyncFormaUsersAsync(CancellationToken ct = default)
    {
        var users = await _context.Users
            .Include(u => u.Organization)
            .Where(u => u.FormaRegistered && u.Email != null)
            .ToListAsync(ct);

        if (users.Count == 0) return 0;

        var formaBaseUrl = _configuration["FormaApiBaseUrl"] ?? "http://forma:8080";
        var secret = _configuration["FormaInternalSecret"] ?? "";

        var payload = users.Select(u =>
        {
            var orgName = u.Organization?.Name;
            var department = string.IsNullOrEmpty(orgName)
                ? u.Unit
                : string.IsNullOrEmpty(u.Unit) ? orgName : $"{orgName}-{u.Unit}";
            return new { u.Email, Unit = department, u.Position };
        });

        using var http = _httpClientFactory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post, $"{formaBaseUrl}/api/internal/sync-users");
        req.Headers.Add("X-Internal-Secret", secret);
        req.Content = JsonContent.Create(payload);

        var response = await http.SendAsync(req, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<SyncResult>(cancellationToken: ct);
        _logger.LogInformation("SyncFormaUsers: 已同步 {Count} 位使用者", result?.Updated ?? 0);
        return result?.Updated ?? 0;
    }

    private record SyncResult(int Updated);

    //日誌管理
    public async Task<PagedResult<DataChangeLog>> GetLogsAsync(string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.DataChangeLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim();
            query = query.Where(x =>
                (x.UserName ?? "").Contains(q) ||
                (x.TableName ?? "").Contains(q) ||
                (x.Action ?? "").Contains(q));
        }

        query = query.OrderByDescending(x => x.OccurredAtUtc);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<DataChangeLog>(items, page, pageSize, total);
    }
    
    
    // ========== 組織管理 ==========
    public async Task<List<OrgTreeNodeDto>> GetOrgTreeAsync(CancellationToken ct)
    {
        var orgs = await _context.Organizations
            .Include(o => o.OrganizationType)
            .AsNoTracking()
            .ToListAsync(ct);

        var lookup = orgs.ToLookup(o => o.ParentId);

        List<OrgTreeNodeDto> BuildTree(int? parentId)
        {
            return lookup[parentId]
                .OrderBy(x => x.Name)
                .Select(x => new OrgTreeNodeDto(
                    x.Id,
                    x.Name,
                    x.OrganizationType?.TypeCode ?? "",
                    x.IsActive,
                    x.Code,
                    x.Address,
                    x.ContactPerson,
                    x.ContactPhone,
                    x.TaxId,
                    BuildTree(x.Id)
                ))
                .ToList();
        }

        return BuildTree(null);
    }

    public async Task<Organization?> GetOrgAsync(int id, CancellationToken ct)
    {
        return await _context.Organizations
            .Include(o => o.OrganizationType)
            .Include(o => o.ParentOrganization)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }

    public async Task<int> CreateOrgAsync(OrgUpsertDto dto, CancellationToken ct)
    {
        await ValidateOrgUpsertAsync(null, dto, ct);

        var org = new Organization
        {
            Name = dto.Name,
            TypeId = dto.TypeId,
            ParentId = dto.ParentId,
            Code = dto.Code,
            Address = dto.Address,
            ContactPerson = dto.ContactPerson,
            ContactPhone = dto.ContactPhone,
            TaxId = dto.TaxId,
            IsActive = dto.IsActive,
            UseParentDomainVerification = dto.UseParentDomainVerification,
            CreatedAt = tool.GetTaiwanNow(),
            UpdatedAt = tool.GetTaiwanNow()
        };

        _context.Organizations.Add(org);
        await _context.SaveChangesAsync(ct);

        return org.Id;
    }

    public async Task UpdateOrgAsync(int id, OrgUpsertDto dto, CancellationToken ct)
    {
        var org = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == id, ct)
                  ?? throw new KeyNotFoundException($"找不到組織 ID={id}");

        await ValidateOrgUpsertAsync(id, dto, ct);

        org.Name = dto.Name;
        org.TypeId = dto.TypeId;
        org.ParentId = dto.ParentId;
        org.Code = dto.Code;
        org.Address = dto.Address;
        org.ContactPerson = dto.ContactPerson;
        org.ContactPhone = dto.ContactPhone;
        org.TaxId = dto.TaxId;
        org.IsActive = dto.IsActive;
        org.UseParentDomainVerification = dto.UseParentDomainVerification;
        org.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    public async Task MoveOrgAsync(int id, int? newParentId, CancellationToken ct)
    {
        var org = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == id, ct)
                  ?? throw new KeyNotFoundException($"找不到組織 ID={id}");

        if (newParentId == id)
            throw new InvalidOperationException("不能將節點移到自身之下。");

        if (newParentId.HasValue)
        {
            var parent = await _context.Organizations.FirstOrDefaultAsync(x => x.Id == newParentId, ct);
            if (parent == null)
                throw new KeyNotFoundException($"找不到上層組織 ID={newParentId}");

            // 檢查循環
            if (await IsDescendantAsync(newParentId.Value, id, ct))
                throw new InvalidOperationException("不能將節點移動到自己的子孫節點下。");
        }

        org.ParentId = newParentId;
        org.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteOrgAsync(int id, CancellationToken ct)
    {
        var hasChildren = await _context.Organizations.AnyAsync(x => x.ParentId == id, ct);
        if (hasChildren)
            throw new InvalidOperationException("刪除前請先移除子組織。");

        var userCount = await _context.Users.CountAsync(u => u.OrganizationId == id, ct);
        if (userCount > 0)
            throw new InvalidOperationException($"此組織下尚有 {userCount} 位使用者，請先移除或移轉使用者後再刪除。");

        var kpiDataCount = await _context.KpiDatas.CountAsync(d => d.OrganizationId == id, ct);
        if (kpiDataCount > 0)
            throw new InvalidOperationException($"此組織下尚有 {kpiDataCount} 筆 KPI 資料，無法刪除。");

        var kpiItemCount = await _context.KpiItems.CountAsync(i => i.OrganizationId == id, ct);
        if (kpiItemCount > 0)
            throw new InvalidOperationException($"此組織下尚有 {kpiItemCount} 筆自訂 KPI 項目，無法刪除。");

        var suggestCount = await _context.SuggestDates.CountAsync(s => s.OrganizationId == id, ct)
                         + await _context.SuggestFiles.CountAsync(s => s.OrganizationId == id, ct);
        if (suggestCount > 0)
            throw new InvalidOperationException($"此組織下尚有 {suggestCount} 筆委員建議資料，無法刪除。");

        var org = await _context.Organizations
            .Include(o => o.Domains)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"找不到組織 ID={id}");

        // 域名設定隨組織一起刪除
        _context.OrganizationDomains.RemoveRange(org.Domains);
        _context.Organizations.Remove(org);
        await _context.SaveChangesAsync(ct);
    }

    // ================================
    // 驗證與輔助
    // ================================

    private async Task ValidateOrgUpsertAsync(int? id, OrgUpsertDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("組織名稱不得為空。");

        // 驗證組織類型
        var typeExists = await _context.OrganizationTypes.AnyAsync(x => x.Id == dto.TypeId, ct);
        if (!typeExists)
            throw new InvalidOperationException($"找不到組織類型 ID={dto.TypeId}");

        // 驗證上層存在
        if (dto.ParentId.HasValue)
        {
            if (id.HasValue && dto.ParentId == id)
                throw new InvalidOperationException("上層組織不可為自己。");

            var parentExists = await _context.Organizations.AnyAsync(x => x.Id == dto.ParentId, ct);
            if (!parentExists)
                throw new InvalidOperationException($"找不到上層組織 ID={dto.ParentId}");
        }

        // 同層名稱唯一
        var duplicate = await _context.Organizations
            .AnyAsync(x =>
                x.Name == dto.Name &&
                x.ParentId == dto.ParentId &&
                (!id.HasValue || x.Id != id.Value), ct);

        if (duplicate)
            throw new InvalidOperationException("同層級下已有相同名稱的組織。");

        // 若啟用階層規則，可補上檢查（OrganizationHierarchy）
        if (dto.ParentId.HasValue)
        {
            var parentTypeId = await _context.Organizations
                .Where(x => x.Id == dto.ParentId.Value)
                .Select(x => x.TypeId)
                .FirstAsync(ct);

            var isAllowed = await _context.OrganizationHierarchies
                .AnyAsync(x => x.ParentTypeId == parentTypeId && x.ChildTypeId == dto.TypeId, ct);

            if (!isAllowed)
                throw new InvalidOperationException("父子組織類型不符合階層規則。");
        }
    }

    private async Task<bool> IsDescendantAsync(int parentId, int childId, CancellationToken ct)
    {
        // 往上追溯 parentId 的所有祖先，若出現 childId 則代表循環
        var current = await _context.Organizations
            .Where(x => x.Id == parentId)
            .Select(x => x.ParentId)
            .FirstOrDefaultAsync(ct);

        while (current.HasValue)
        {
            if (current.Value == childId)
                return true;

            current = await _context.Organizations
                .Where(x => x.Id == current.Value)
                .Select(x => x.ParentId)
                .FirstOrDefaultAsync(ct);
        }

        return false;
    }
    
     // ================== 組織「類型」 ==================
    public async Task<List<AdminController.OrgTypeDto>> GetOrgTypesAsync(CancellationToken ct)
    {
        return await _context.OrganizationTypes
            .OrderBy(t => t.Id)
            .Select(t => new AdminController.OrgTypeDto(
                t.Id, t.TypeCode, t.TypeName!, t.Description, t.CanHaveChildren
            ))
            .ToListAsync(ct);
    }

    public async Task<int> CreateOrgTypeAsync(AdminController.OrgTypeUpsertDto dto, CancellationToken ct)
    {
        // 唯一性：TypeCode
        var exists = await _context.OrganizationTypes
            .AnyAsync(t => t.TypeCode == dto.TypeCode, ct);
        if (exists) throw new InvalidOperationException($"TypeCode 已存在：{dto.TypeCode}");

        var entity = new OrganizationType
        {
            TypeCode = dto.TypeCode,
            TypeName = dto.TypeName,
            Description = dto.Description ?? "",
            CanHaveChildren = dto.CanHaveChildren,
            CreatedAt = tool.GetTaiwanNow()
        };
        _context.OrganizationTypes.Add(entity);
        await _context.SaveChangesAsync(ct);
        return entity.Id;
    }

    public async Task UpdateOrgTypeAsync(int id, AdminController.OrgTypeUpsertDto dto, CancellationToken ct)
    {
        var entity = await _context.OrganizationTypes.FindAsync([id], ct);
        if (entity == null) throw new KeyNotFoundException("OrganizationType 不存在");

        // 若修改 TypeCode，要檢查唯一
        if (!string.Equals(entity.TypeCode, dto.TypeCode, StringComparison.Ordinal))
        {
            var dup = await _context.OrganizationTypes
                .AnyAsync(t => t.TypeCode == dto.TypeCode && t.Id != id, ct);
            if (dup) throw new InvalidOperationException($"TypeCode 已存在：{dto.TypeCode}");
            entity.TypeCode = dto.TypeCode;
        }

        entity.TypeName = dto.TypeName;
        entity.Description = dto.Description ?? "";
        entity.CanHaveChildren = dto.CanHaveChildren;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteOrgTypeAsync(int id, CancellationToken ct)
    {
        var entity = await _context.OrganizationTypes
            .Include(t => t.Organizations)
            .Include(t => t.ParentHierarchies)
            .Include(t => t.ChildHierarchies)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (entity == null) return;

        // 被參照保護：有組織或規則就不得刪
        var hasOrg = entity.Organizations.Any();
        var hasHier = entity.ParentHierarchies.Any() || entity.ChildHierarchies.Any();
        if (hasOrg || hasHier)
            throw new InvalidOperationException("此類型已被組織或階層規則參照，無法刪除");

        _context.OrganizationTypes.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }


    // ================== 組織「階層規則」 ==================
    public async Task<List<AdminController.HierRuleDto>> GetHierarchyRulesAsync(CancellationToken ct)
    {
        return await _context.OrganizationHierarchies
            .OrderBy(h => h.ParentTypeId).ThenBy(h => h.ChildTypeId)
            .Select(h => new AdminController.HierRuleDto(
                h.Id, h.ParentTypeId, h.ChildTypeId, h.IsRequired, h.MaxChildren
            ))
            .ToListAsync(ct);
    }

    public async Task<int> CreateHierarchyRuleAsync(AdminController.HierRuleUpsertDto dto, CancellationToken ct)
    {
        if (dto.ParentTypeId == dto.ChildTypeId)
            throw new InvalidOperationException("ParentType 與 ChildType 不可相同");

        var parent = await _context.OrganizationTypes.FindAsync([dto.ParentTypeId], ct);
        var child  = await _context.OrganizationTypes.FindAsync([dto.ChildTypeId], ct);
        if (parent == null || child == null)
            throw new KeyNotFoundException("ParentType 或 ChildType 不存在");

        if (!parent.CanHaveChildren)
            throw new InvalidOperationException($"父類型 {parent.TypeName} 不允許擁有子層");

        // 禁止重複
        var dup = await _context.OrganizationHierarchies.AnyAsync(h =>
            h.ParentTypeId == dto.ParentTypeId &&
            h.ChildTypeId  == dto.ChildTypeId, ct);
        if (dup) throw new InvalidOperationException("相同的階層規則已存在");

        var entity = new OrganizationHierarchy
        {
            ParentTypeId = dto.ParentTypeId,
            ChildTypeId = dto.ChildTypeId,
            IsRequired = dto.IsRequired,
            MaxChildren = dto.MaxChildren,
            CreatedAt = tool.GetTaiwanNow()
        };
        _context.OrganizationHierarchies.Add(entity);
        await _context.SaveChangesAsync(ct);
        return entity.Id;
    }

    public async Task UpdateHierarchyRuleAsync(int id, AdminController.HierRuleUpsertDto dto, CancellationToken ct)
    {
        var entity = await _context.OrganizationHierarchies.FindAsync([id], ct);
        if (entity == null) throw new KeyNotFoundException("階層規則不存在");

        if (dto.ParentTypeId == dto.ChildTypeId)
            throw new InvalidOperationException("ParentType 與 ChildType 不可相同");

        // 驗證 parent/child 存在
        var parent = await _context.OrganizationTypes.FindAsync([dto.ParentTypeId], ct);
        var child  = await _context.OrganizationTypes.FindAsync([dto.ChildTypeId], ct);
        if (parent == null || child == null)
            throw new KeyNotFoundException("ParentType 或 ChildType 不存在");
        if (!parent.CanHaveChildren)
            throw new InvalidOperationException($"父類型 {parent.TypeName} 不允許擁有子層");

        // 若有改動，檢查重複
        var willDup = await _context.OrganizationHierarchies.AnyAsync(h =>
            h.ParentTypeId == dto.ParentTypeId &&
            h.ChildTypeId  == dto.ChildTypeId &&
            h.Id != id, ct);
        if (willDup) throw new InvalidOperationException("相同的階層規則已存在");

        entity.ParentTypeId = dto.ParentTypeId;
        entity.ChildTypeId  = dto.ChildTypeId;
        entity.IsRequired   = dto.IsRequired;
        entity.MaxChildren  = dto.MaxChildren;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteHierarchyRuleAsync(int id, CancellationToken ct)
    {
        var entity = await _context.OrganizationHierarchies.FirstOrDefaultAsync(h => h.Id == id, ct);
        if (entity == null) return;

        // （可選）若你的資料已經建立了 Type → Org 的約束，也可以在此檢查刪除此規則是否會造成
        // 既有組織樹「不合法」。若要嚴格控管，可先做靜態檢核再准予刪除。

        _context.OrganizationHierarchies.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // ================== 組織「網域」 ==================
    public async Task<List<OrgDomainDto>> GetOrgDomainsAsync(int? orgId, CancellationToken ct)
    {
        var query = _context.OrganizationDomains
            .Include(d => d.Organization)
            .AsNoTracking()
            .AsQueryable();

        if (orgId.HasValue)
            query = query.Where(d => d.OrganizationId == orgId.Value);

        return await query
            .OrderBy(d => d.OrganizationId).ThenBy(d => d.Priority)
            .Select(d => new OrgDomainDto(
                d.Id, d.OrganizationId, d.Organization.Name,
                d.DomainName, d.Description,
                d.IsPrimary, d.IsSharedWithChildren,
                d.Priority, d.IsActive,
                d.VerifiedAt, d.CreatedAt
            ))
            .ToListAsync(ct);
    }

    public async Task<OrgDomainDto?> GetOrgDomainAsync(int id, CancellationToken ct)
    {
        return await _context.OrganizationDomains
            .Include(d => d.Organization)
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new OrgDomainDto(
                d.Id, d.OrganizationId, d.Organization.Name,
                d.DomainName, d.Description,
                d.IsPrimary, d.IsSharedWithChildren,
                d.Priority, d.IsActive,
                d.VerifiedAt, d.CreatedAt
            ))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<int> CreateOrgDomainAsync(OrgDomainUpsertDto dto, CancellationToken ct)
    {
        var orgExists = await _context.Organizations.AnyAsync(o => o.Id == dto.OrganizationId, ct);
        if (!orgExists) throw new KeyNotFoundException($"找不到組織 ID={dto.OrganizationId}");

        var dup = await _context.OrganizationDomains
            .AnyAsync(d => d.DomainName == dto.DomainName && d.OrganizationId == dto.OrganizationId, ct);
        if (dup) throw new InvalidOperationException($"該組織已存在相同網域：{dto.DomainName}");

        var entity = new OrganizationDomain
        {
            OrganizationId = dto.OrganizationId,
            DomainName = dto.DomainName,
            Description = dto.Description,
            IsPrimary = dto.IsPrimary,
            IsSharedWithChildren = dto.IsSharedWithChildren,
            Priority = dto.Priority,
            IsActive = dto.IsActive,
            CreatedAt = tool.GetTaiwanNow(),
            UpdatedAt = tool.GetTaiwanNow()
        };
        _context.OrganizationDomains.Add(entity);
        await _context.SaveChangesAsync(ct);
        return entity.Id;
    }

    public async Task UpdateOrgDomainAsync(int id, OrgDomainUpsertDto dto, CancellationToken ct)
    {
        var entity = await _context.OrganizationDomains.FindAsync([id], ct)
                     ?? throw new KeyNotFoundException($"找不到網域 ID={id}");

        var orgExists = await _context.Organizations.AnyAsync(o => o.Id == dto.OrganizationId, ct);
        if (!orgExists) throw new KeyNotFoundException($"找不到組織 ID={dto.OrganizationId}");

        // 檢查同組織下域名是否重複（排除自身）
        var dup = await _context.OrganizationDomains
            .AnyAsync(d => d.DomainName == dto.DomainName && d.OrganizationId == dto.OrganizationId && d.Id != id, ct);
        if (dup) throw new InvalidOperationException($"該組織已存在相同網域：{dto.DomainName}");

        entity.OrganizationId = dto.OrganizationId;
        entity.DomainName = dto.DomainName;
        entity.Description = dto.Description;
        entity.IsPrimary = dto.IsPrimary;
        entity.IsSharedWithChildren = dto.IsSharedWithChildren;
        entity.Priority = dto.Priority;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteOrgDomainAsync(int id, CancellationToken ct)
    {
        var entity = await _context.OrganizationDomains.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (entity == null) return;

        _context.OrganizationDomains.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Helpers ===============

    private static bool Overlaps(int start1, int? end1, int start2, int? end2)
    {
        var e1 = end1 ?? int.MaxValue;
        var e2 = end2 ?? int.MaxValue;
        return start1 <= e2 && start2 <= e1;
    }

    private static void Ensure(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }

    private async Task EnsureItemCategoryOrgRuleAsync(int kpiCategoryId, int? organizationId, CancellationToken ct)
    {
        // 0=基礎型 不需 Org；1/2=客製/麥寮台塑 需 Org
        if (kpiCategoryId == 0)
        {
            return;
        }
        Ensure(organizationId.HasValue, "此指標類別需指定 OrganizationId");
        var exists = await _context.Organizations.AnyAsync(o => o.Id == organizationId.Value, ct);
        Ensure(exists, "Organization 不存在");
    }

    private static readonly Dictionary<ReportStatus, ReportStatus[]> AllowedStatusFlows = new()
    {
        { ReportStatus.Draft,     new[]{ ReportStatus.Submitted } },
        { ReportStatus.Submitted, new[]{ ReportStatus.Reviewed, ReportStatus.Returned, ReportStatus.Finalized } },
        { ReportStatus.Returned,  new[]{ ReportStatus.Submitted } },
        { ReportStatus.Reviewed,  new[]{ ReportStatus.Finalized, ReportStatus.Returned } },
        { ReportStatus.Finalized, Array.Empty<ReportStatus>() }
    };

    private static string PeriodNormalize(string period)
    {
        period = (period ?? "").Trim().ToUpperInvariant();
        // 允許 Q1/Q2/Q3/Q4/H1/Y
        return period;
    }

    // =============== Fields ===============

    public async Task<IEnumerable<KpiFieldDto>> GetFieldsAsync(CancellationToken ct)
    {
        var rows = await _context.KpiFields
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => new KpiFieldDto(x.Id, x.field, x.enfield))
            .ToListAsync(ct);
        return rows;
    }

    public async Task<int> CreateFieldAsync(KpiFieldUpsertDto dto, CancellationToken ct)
    {
        if (dto is null) throw new ArgumentNullException(nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.Field) || string.IsNullOrWhiteSpace(dto.EnField))
            throw new ValidationException("Field/EnField 為必填");

        var dup = await _context.KpiFields.AnyAsync(x => x.field == dto.Field, ct);
        Ensure(!dup, "已存在相同中文名稱的領域");

        var entity = new KpiField
        {
            field = dto.Field.Trim(),
            enfield = dto.EnField.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        _context.KpiFields.Add(entity);
        await _context.SaveChangesAsync(ct);
        return entity.Id;
    }

    public async Task UpdateFieldAsync(int id, KpiFieldUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiFields.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new KeyNotFoundException("KpiField 不存在");

        if (string.IsNullOrWhiteSpace(dto.Field) || string.IsNullOrWhiteSpace(dto.EnField))
            throw new ValidationException("Field/EnField 為必填");

        var dup = await _context.KpiFields.AnyAsync(x => x.Id != id && x.field == dto.Field, ct);
        Ensure(!dup, "已存在相同中文名稱的領域");

        e.field = dto.Field.Trim();
        e.enfield = dto.EnField.Trim();
        e.UpdateAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteFieldAsync(int id, CancellationToken ct)
    {
        var e = await _context.KpiFields.Include(x => x.KpiItems).FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new KeyNotFoundException("KpiField 不存在");

        Ensure(!e.KpiItems.Any(), "此領域下仍有 KpiItem，禁止刪除");

        _context.KpiFields.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Items ===============

    public async Task<PagedResult<KpiItemRowDto>> SearchItemsAsync(
        int page, int pageSize, int? fieldId, int? category, int? orgId, string? q, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Max(1, Math.Min(pageSize, 200));

        var year = DateTime.UtcNow.Year;
        var query = _context.KpiItems
            .AsNoTracking()
            .Include(x => x.KpiField)
            .Include(x => x.Organization)
            .Include(x => x.KpiItemNames)
            .AsQueryable();

        if (fieldId.HasValue) query = query.Where(x => x.KpiFieldId == fieldId.Value);
        if (category.HasValue) query = query.Where(x => x.KpiCategoryId == category.Value);
        if (orgId.HasValue) query = query.Where(x => x.OrganizationId == orgId.Value);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var kw = q.Trim();
            query = query.Where(x =>
                x.IndicatorNumber.ToString().Contains(kw) ||
                x.KpiItemNames.Any(n => n.Name.Contains(kw)) ||
                // 也要能用「細項名稱」搜到——使用者常常記得的是細項（例如「計劃訓練人數」），
                // 不是指標項目本身的名稱（例如「製程安全訓練和能力落實比率」）
                x.KpiDetailItems.Any(d => d.KpiDetailItemNames.Any(n => n.Name.Contains(kw))));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(x => x.KpiFieldId).ThenBy(x => x.IndicatorNumber)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new KpiItemRowDto(
                x.Id,
                x.IndicatorNumber,
                x.KpiCategoryId,
                x.KpiFieldId,
                x.KpiField.field,
                x.OrganizationId,
                x.Organization != null ? x.Organization.Name : null,
                x.KpiItemNames
                    .Where(n => n.StartYear <= year && (n.EndYear == null || n.EndYear >= year))
                    .OrderByDescending(n => n.StartYear)
                    .Select(n => n.Name)
                    .FirstOrDefault()
                    ?? x.KpiItemNames
                        .OrderByDescending(n => n.StartYear)
                        .Select(n => n.Name)
                        .FirstOrDefault() ?? "(未命名)",
                x.KpiDetailItems.Count,
                x.CreateTime
            ))
            .ToListAsync(ct);

        return new PagedResult<KpiItemRowDto>(items, page, pageSize, total);
    }

    public async Task<KpiItemDetailDto> GetItemAsync(int id, CancellationToken ct)
    {
        var e = await _context.KpiItems
            .AsNoTracking()
            .Include(x => x.Organization)
            .Include(x => x.KpiItemNames)
            .Include(x => x.KpiDetailItems)
                .ThenInclude(d => d.KpiDetailItemNames)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("KpiItem 不存在");

        return new KpiItemDetailDto(
            e.Id,
            e.IndicatorNumber,
            e.KpiCategoryId,
            e.KpiFieldId,
            e.OrganizationId,
            e.Organization?.Name,
            e.KpiItemNames
                .OrderBy(n => n.StartYear)
                .Select(n => new KpiItemNameDto(n.Id, n.KpiItemId, n.Name, n.StartYear, n.EndYear, n.UserEmail))
                .ToList(),
            e.KpiDetailItems.Select(d => new KpiDetailItemDto(
                d.Id, d.KpiItemId, d.Unit, d.ComparisonOperator, d.IsIndicator,
                d.KpiDetailItemNames
                    .OrderBy(n => n.StartYear)
                    .Select(n => new KpiDetailItemNameDto(n.Id, n.KpiDetailItemId, n.Name, n.StartYear, n.EndYear, n.UserEmail))
                    .ToList()
            )).ToList(),
            e.CreateTime,
            e.UploadTime
        );
    }

    public async Task<int> CreateItemAsync(KpiItemUpsertDto dto, CancellationToken ct)
    {
        if (dto is null) throw new ArgumentNullException(nameof(dto));
        Ensure(dto.IndicatorNumber > 0, "IndicatorNumber 必須為正整數");

        await EnsureItemCategoryOrgRuleAsync(dto.KpiCategoryId, dto.OrganizationId, ct);

        var fieldExists = await _context.KpiFields.AnyAsync(f => f.Id == dto.KpiFieldId, ct);
        Ensure(fieldExists, "KpiField 不存在");

        var entity = new KpiItem
        {
            IndicatorNumber = dto.IndicatorNumber,
            KpiCategoryId = dto.KpiCategoryId,
            KpiFieldId = dto.KpiFieldId,
            OrganizationId = dto.OrganizationId,
            CreateTime = DateTime.UtcNow,
            UploadTime = DateTime.UtcNow
        };
        _context.KpiItems.Add(entity);
        await _context.SaveChangesAsync(ct);
        return entity.Id;
    }

    public async Task UpdateItemAsync(int id, KpiItemUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiItems.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("KpiItem 不存在");

        Ensure(dto.IndicatorNumber > 0, "IndicatorNumber 必須為正整數");
        await EnsureItemCategoryOrgRuleAsync(dto.KpiCategoryId, dto.OrganizationId, ct);
        var fieldExists = await _context.KpiFields.AnyAsync(f => f.Id == dto.KpiFieldId, ct);
        Ensure(fieldExists, "KpiField 不存在");

        e.IndicatorNumber = dto.IndicatorNumber;
        e.KpiCategoryId = dto.KpiCategoryId;
        e.KpiFieldId = dto.KpiFieldId;
        e.OrganizationId = dto.OrganizationId;
        e.UploadTime = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteItemAsync(int id, CancellationToken ct)
    {
        var e = await _context.KpiItems
            .Include(x => x.KpiDetailItems).ThenInclude(d => d.KpiDatas).ThenInclude(k => k.KpiReports)
            .Include(x => x.KpiItemNames)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("KpiItem 不存在");

        // 若有資料，建議禁止刪除（或你改 soft-delete）
        Ensure(!e.KpiDetailItems.Any(), "此指標已有細項/資料，不可刪除");

        _context.KpiItemNames.RemoveRange(e.KpiItemNames);
        _context.KpiItems.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Item Names ===============

    public async Task AddItemNameAsync(int itemId, KpiItemNameUpsertDto dto, string userEmail, CancellationToken ct)
    {
        var item = await _context.KpiItems.Include(x => x.KpiItemNames).FirstOrDefaultAsync(x => x.Id == itemId, ct)
            ?? throw new KeyNotFoundException("KpiItem 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "名稱必填");

        // 區間不重疊
        foreach (var n in item.KpiItemNames)
        {
            if (Overlaps(n.StartYear, n.EndYear, dto.StartYear, dto.EndYear))
                throw new InvalidOperationException("名稱版本期間重疊，請調整 Start/EndYear。");
        }

        var entity = new KpiItemName
        {
            KpiItemId = itemId,
            Name = dto.Name.Trim(),
            StartYear = dto.StartYear,
            EndYear = dto.EndYear,
            UserEmail = userEmail,
            CreatedAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        _context.KpiItemNames.Add(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateItemNameAsync(int itemId, int nameId, KpiItemNameUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiItemNames.FirstOrDefaultAsync(x => x.Id == nameId && x.KpiItemId == itemId, ct)
            ?? throw new KeyNotFoundException("ItemName 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "名稱必填");

        var siblings = await _context.KpiItemNames
            .Where(x => x.KpiItemId == itemId && x.Id != nameId)
            .ToListAsync(ct);

        foreach (var n in siblings)
        {
            if (Overlaps(n.StartYear, n.EndYear, dto.StartYear, dto.EndYear))
                throw new InvalidOperationException("名稱版本期間重疊，請調整 Start/EndYear。");
        }

        e.Name = dto.Name.Trim();
        e.StartYear = dto.StartYear;
        e.EndYear = dto.EndYear;
        e.UpdateAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteItemNameAsync(int itemId, int nameId, CancellationToken ct)
    {
        var e = await _context.KpiItemNames.FirstOrDefaultAsync(x => x.Id == nameId && x.KpiItemId == itemId, ct)
            ?? throw new KeyNotFoundException("ItemName 不存在");
        _context.KpiItemNames.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Detail Items ===============

    public async Task<int> AddDetailItemAsync(int itemId, KpiDetailItemUpsertDto dto, CancellationToken ct)
    {
        var item = await _context.KpiItems.FirstOrDefaultAsync(x => x.Id == itemId, ct)
            ?? throw new KeyNotFoundException("KpiItem 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Unit), "Unit 必填");
        if (dto.ComparisonOperator != null)
            Ensure(dto.ComparisonOperator.Length <= 3, "ComparisonOperator 最多 3 字元");

        var e = new KpiDetailItem
        {
            KpiItemId = item.Id,
            Unit = dto.Unit.Trim(),
            ComparisonOperator = dto.ComparisonOperator?.Trim(),
            IsIndicator = dto.IsIndicator,
            CreateTime = DateTime.UtcNow,
            UploadTime = DateTime.UtcNow
        };
        _context.KpiDetailItems.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateDetailItemAsync(int detailId, KpiDetailItemUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiDetailItems.FirstOrDefaultAsync(x => x.Id == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItem 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Unit), "Unit 必填");
        if (dto.ComparisonOperator != null)
            Ensure(dto.ComparisonOperator.Length <= 3, "ComparisonOperator 最多 3 字元");

        e.Unit = dto.Unit.Trim();
        e.ComparisonOperator = dto.ComparisonOperator?.Trim();
        e.IsIndicator = dto.IsIndicator;
        e.UploadTime = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteDetailItemAsync(int detailId, CancellationToken ct)
    {
        var e = await _context.KpiDetailItems
            .Include(d => d.KpiDatas).ThenInclude(k => k.KpiReports)
            .Include(d => d.KpiDetailItemNames)
            .FirstOrDefaultAsync(x => x.Id == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItem 不存在");

        Ensure(!e.KpiDatas.Any(), "此細項已有資料/報告，不可刪除");

        _context.KpiDetailItemNames.RemoveRange(e.KpiDetailItemNames);
        _context.KpiDetailItems.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Detail Item Names ===============

    public async Task AddDetailItemNameAsync(int detailId, KpiDetailItemNameUpsertDto dto, string userEmail, CancellationToken ct)
    {
        var detail = await _context.KpiDetailItems.Include(x => x.KpiDetailItemNames)
            .FirstOrDefaultAsync(x => x.Id == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItem 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "名稱必填");

        foreach (var n in detail.KpiDetailItemNames)
        {
            if (Overlaps(n.StartYear, n.EndYear, dto.StartYear, dto.EndYear))
                throw new InvalidOperationException("名稱版本期間重疊，請調整 Start/EndYear。");
        }

        var e = new KpiDetailItemName
        {
            KpiDetailItemId = detailId,
            Name = dto.Name.Trim(),
            StartYear = dto.StartYear,
            EndYear = dto.EndYear,
            UserEmail = userEmail,
            CreatedAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        _context.KpiDetailItemNames.Add(e);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateDetailItemNameAsync(int detailId, int nameId, KpiDetailItemNameUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiDetailItemNames
            .FirstOrDefaultAsync(x => x.Id == nameId && x.KpiDetailItemId == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItemName 不存在");

        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "名稱必填");

        var siblings = await _context.KpiDetailItemNames
            .Where(x => x.KpiDetailItemId == detailId && x.Id != nameId)
            .ToListAsync(ct);

        foreach (var n in siblings)
        {
            if (Overlaps(n.StartYear, n.EndYear, dto.StartYear, dto.EndYear))
                throw new InvalidOperationException("名稱版本期間重疊，請調整 Start/EndYear。");
        }

        e.Name = dto.Name.Trim();
        e.StartYear = dto.StartYear;
        e.EndYear = dto.EndYear;
        e.UpdateAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteDetailItemNameAsync(int detailId, int nameId, CancellationToken ct)
    {
        var e = await _context.KpiDetailItemNames
            .FirstOrDefaultAsync(x => x.Id == nameId && x.KpiDetailItemId == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItemName 不存在");

        _context.KpiDetailItemNames.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Detail Item Mapping Groups（政策修訂計畫，底下掛多筆對照） ===============

    private static string? LatestDetailItemName(IEnumerable<KpiDetailItemName> names) =>
        names.OrderByDescending(n => n.StartYear).Select(n => n.Name).FirstOrDefault();

    private static string? LatestItemName(IEnumerable<KpiItemName> names) =>
        names.OrderByDescending(n => n.StartYear).Select(n => n.Name).FirstOrDefault();

    private static KpiDetailItemMappingDto ToMappingDto(KpiDetailItemMapping m) => new(
        m.Id, m.GroupId,
        m.OldKpiItemId, LatestItemName(m.OldKpiItem.KpiItemNames),
        m.NewKpiItemId, LatestItemName(m.NewKpiItem.KpiItemNames),
        m.OldDetailItemId, m.OldDetailItem == null ? null : LatestDetailItemName(m.OldDetailItem.KpiDetailItemNames),
        m.NewDetailItemId, m.NewDetailItem == null ? null : LatestDetailItemName(m.NewDetailItem.KpiDetailItemNames));

    public async Task<IEnumerable<KpiDetailItemMappingGroupDto>> GetDetailItemMappingGroupsAsync(CancellationToken ct)
    {
        var groups = await _context.KpiDetailItemMappingGroups
            .Include(g => g.Mappings).ThenInclude(m => m.OldKpiItem).ThenInclude(i => i.KpiItemNames)
            .Include(g => g.Mappings).ThenInclude(m => m.NewKpiItem).ThenInclude(i => i.KpiItemNames)
            .Include(g => g.Mappings).ThenInclude(m => m.OldDetailItem).ThenInclude(d => d.KpiDetailItemNames)
            .Include(g => g.Mappings).ThenInclude(m => m.NewDetailItem).ThenInclude(d => d.KpiDetailItemNames)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        return groups.Select(g => new KpiDetailItemMappingGroupDto(
            g.Id, g.Name, g.EffectiveYear, g.Note, g.CreatedByEmail, g.CreatedAt,
            g.Mappings.Select(ToMappingDto).ToList()));
    }

    public async Task<int> CreateDetailItemMappingGroupAsync(KpiDetailItemMappingGroupUpsertDto dto, string userEmail, CancellationToken ct)
    {
        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "計畫名稱必填");

        var e = new KpiDetailItemMappingGroup
        {
            Name = dto.Name.Trim(),
            EffectiveYear = dto.EffectiveYear,
            Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
            CreatedByEmail = userEmail,
            CreatedAt = DateTime.UtcNow
        };
        _context.KpiDetailItemMappingGroups.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateDetailItemMappingGroupAsync(int groupId, KpiDetailItemMappingGroupUpsertDto dto, CancellationToken ct)
    {
        Ensure(!string.IsNullOrWhiteSpace(dto.Name), "計畫名稱必填");

        var e = await _context.KpiDetailItemMappingGroups.FirstOrDefaultAsync(x => x.Id == groupId, ct)
            ?? throw new KeyNotFoundException("修訂計畫不存在");

        e.Name = dto.Name.Trim();
        e.EffectiveYear = dto.EffectiveYear;
        e.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteDetailItemMappingGroupAsync(int groupId, CancellationToken ct)
    {
        var e = await _context.KpiDetailItemMappingGroups
            .Include(g => g.Mappings)
            .FirstOrDefaultAsync(x => x.Id == groupId, ct)
            ?? throw new KeyNotFoundException("修訂計畫不存在");

        // Mappings 走 Cascade 設定會一併刪除
        _context.KpiDetailItemMappingGroups.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    private async Task ValidateMappingPairAsync(KpiDetailItemMappingUpsertDto dto, int? excludeMappingId, CancellationToken ct)
    {
        Ensure((dto.OldDetailItemId == null) == (dto.NewDetailItemId == null),
            "舊/新指標細項要嘛都指定、要嘛都留空——留空代表涵蓋整個指標項目底下的全部細項");
        Ensure(dto.OldKpiItemId != dto.NewKpiItemId || dto.OldDetailItemId != dto.NewDetailItemId,
            "新舊不可為完全相同的指標/細項");

        var oldItemExists = await _context.KpiItems.AnyAsync(x => x.Id == dto.OldKpiItemId, ct);
        Ensure(oldItemExists, "舊指標項目不存在");
        var newItemExists = await _context.KpiItems.AnyAsync(x => x.Id == dto.NewKpiItemId, ct);
        Ensure(newItemExists, "新指標項目不存在");

        if (dto.OldDetailItemId.HasValue && dto.NewDetailItemId.HasValue)
        {
            var oldDetail = await _context.KpiDetailItems.FirstOrDefaultAsync(x => x.Id == dto.OldDetailItemId, ct);
            Ensure(oldDetail != null, "舊指標細項不存在");
            Ensure(oldDetail!.KpiItemId == dto.OldKpiItemId, "舊指標細項不屬於選擇的舊指標項目");

            var newDetail = await _context.KpiDetailItems.FirstOrDefaultAsync(x => x.Id == dto.NewDetailItemId, ct);
            Ensure(newDetail != null, "新指標細項不存在");
            Ensure(newDetail!.KpiItemId == dto.NewKpiItemId, "新指標細項不屬於選擇的新指標項目");

            var oldTaken = await _context.KpiDetailItemMappings
                .AnyAsync(m => m.OldDetailItemId == dto.OldDetailItemId && m.Id != excludeMappingId, ct);
            Ensure(!oldTaken, "這個舊指標細項已經有對照紀錄了");
            var newTaken = await _context.KpiDetailItemMappings
                .AnyAsync(m => m.NewDetailItemId == dto.NewDetailItemId && m.Id != excludeMappingId, ct);
            Ensure(!newTaken, "這個新指標細項已經被其他對照紀錄使用了");
        }
        else
        {
            var oldTaken = await _context.KpiDetailItemMappings
                .AnyAsync(m => m.OldDetailItemId == null && m.OldKpiItemId == dto.OldKpiItemId && m.Id != excludeMappingId, ct);
            Ensure(!oldTaken, "這個舊指標項目已經有「全部細項」的對照紀錄了");
            var newTaken = await _context.KpiDetailItemMappings
                .AnyAsync(m => m.NewDetailItemId == null && m.NewKpiItemId == dto.NewKpiItemId && m.Id != excludeMappingId, ct);
            Ensure(!newTaken, "這個新指標項目已經被其他「全部細項」對照使用了");
        }

        var reverseExists = await _context.KpiDetailItemMappings
            .AnyAsync(m => m.OldKpiItemId == dto.NewKpiItemId && m.NewKpiItemId == dto.OldKpiItemId
                && m.OldDetailItemId == dto.NewDetailItemId && m.NewDetailItemId == dto.OldDetailItemId
                && m.Id != excludeMappingId, ct);
        Ensure(!reverseExists, "這兩者已經有反向的對照紀錄，不可再建立");
    }

    public async Task<int> AddDetailItemMappingAsync(int groupId, KpiDetailItemMappingUpsertDto dto, CancellationToken ct)
    {
        var groupExists = await _context.KpiDetailItemMappingGroups.AnyAsync(x => x.Id == groupId, ct);
        Ensure(groupExists, "修訂計畫不存在");

        await ValidateMappingPairAsync(dto, null, ct);

        var e = new KpiDetailItemMapping
        {
            GroupId = groupId,
            OldKpiItemId = dto.OldKpiItemId,
            NewKpiItemId = dto.NewKpiItemId,
            OldDetailItemId = dto.OldDetailItemId,
            NewDetailItemId = dto.NewDetailItemId,
        };
        _context.KpiDetailItemMappings.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateDetailItemMappingAsync(int mappingId, KpiDetailItemMappingUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiDetailItemMappings.FirstOrDefaultAsync(x => x.Id == mappingId, ct)
            ?? throw new KeyNotFoundException("對照紀錄不存在");

        await ValidateMappingPairAsync(dto, mappingId, ct);

        e.OldKpiItemId = dto.OldKpiItemId;
        e.NewKpiItemId = dto.NewKpiItemId;
        e.OldDetailItemId = dto.OldDetailItemId;
        e.NewDetailItemId = dto.NewDetailItemId;
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteDetailItemMappingAsync(int id, CancellationToken ct)
    {
        var e = await _context.KpiDetailItemMappings.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("對照紀錄不存在");

        _context.KpiDetailItemMappings.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== Report Period Setting（填報期別鎖定） ===============

    public async Task<ReportPeriodSettingDto> GetReportPeriodSettingAsync(CancellationToken ct)
    {
        var e = await _context.ReportPeriodSettings.OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (e == null)
        {
            // 還沒設定過：預設不鎖定，年度用現在民國年、季度用 Q2，讓前端維持原本自由選擇的行為
            return new ReportPeriodSettingDto(DateTime.UtcNow.Year - 1911, "Q2", false, null, null);
        }
        return new ReportPeriodSettingDto(e.CurrentYear, e.CurrentQuarter, e.IsLocked, e.UpdatedByEmail, e.UpdatedAt);
    }

    public async Task UpdateReportPeriodSettingAsync(ReportPeriodSettingUpsertDto dto, string userEmail, CancellationToken ct)
    {
        Ensure(!string.IsNullOrWhiteSpace(dto.CurrentQuarter), "季度必填");

        var e = await _context.ReportPeriodSettings.OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (e == null)
        {
            e = new ReportPeriodSetting();
            _context.ReportPeriodSettings.Add(e);
        }
        e.CurrentYear = dto.CurrentYear;
        e.CurrentQuarter = dto.CurrentQuarter.Trim();
        e.IsLocked = dto.IsLocked;
        e.UpdatedByEmail = userEmail;
        e.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // =============== KpiData（基線/目標） ===============

    public async Task<IEnumerable<KpiDataDto>> ListKpiDataAsync(int detailId, CancellationToken ct)
    {
        var exists = await _context.KpiDetailItems.AnyAsync(x => x.Id == detailId, ct);
        Ensure(exists, "DetailItem 不存在");

        var rows = await _context.KpiDatas
            .AsNoTracking()
            .Where(x => x.DetailItemId == detailId)
            .OrderBy(x => x.Id)
            .Select(x => new KpiDataDto(
                x.Id, x.IsApplied, x.BaselineYear, x.BaselineValue, x.TargetValue, x.Remarks,
                x.DetailItemId, x.KpiCycleId, x.OrganizationId, x.ProductionSite))
            .ToListAsync(ct);

        return rows;
    }

    public async Task<int> AddKpiDataAsync(int detailId, KpiDataUpsertDto dto, CancellationToken ct)
    {
        var detail = await _context.KpiDetailItems
            .Include(d => d.KpiItem)
            .FirstOrDefaultAsync(x => x.Id == detailId, ct)
            ?? throw new KeyNotFoundException("DetailItem 不存在");

        if (string.IsNullOrWhiteSpace(dto.BaselineYear))
            throw new ValidationException("BaselineYear 必填");

        // 若該 KpiItem 是客製/麥寮台塑，要求 OrganizationId
        if (detail.KpiItem.KpiCategoryId != 0)
            Ensure(dto.OrganizationId.HasValue, "此指標類別需指定 OrganizationId");

        var e = new KpiData
        {
            DetailItemId = detailId,
            IsApplied = dto.IsApplied,
            BaselineYear = dto.BaselineYear.Trim(),
            BaselineValue = dto.BaselineValue,
            TargetValue = dto.TargetValue,
            Remarks = dto.Remarks,
            KpiCycleId = dto.KpiCycleId,
            OrganizationId = dto.OrganizationId,
            ProductionSite = dto.ProductionSite,
            CreatedAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };
        _context.KpiDatas.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateKpiDataAsync(int dataId, KpiDataUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiDatas
            .Include(k => k.DetailItem).ThenInclude(d => d.KpiItem)
            .FirstOrDefaultAsync(x => x.Id == dataId, ct)
            ?? throw new KeyNotFoundException("KpiData 不存在");

        if (string.IsNullOrWhiteSpace(dto.BaselineYear))
            throw new ValidationException("BaselineYear 必填");

        if (e.DetailItem.KpiItem.KpiCategoryId != 0)
            Ensure(dto.OrganizationId.HasValue, "此指標類別需指定 OrganizationId");

        e.IsApplied = dto.IsApplied;
        e.BaselineYear = dto.BaselineYear.Trim();
        e.BaselineValue = dto.BaselineValue;
        e.TargetValue = dto.TargetValue;
        e.Remarks = dto.Remarks;
        e.KpiCycleId = dto.KpiCycleId;
        e.OrganizationId = dto.OrganizationId;
        e.ProductionSite = dto.ProductionSite;
        e.UpdateAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteKpiDataAsync(int dataId, CancellationToken ct)
    {
        var e = await _context.KpiDatas
            .Include(x => x.KpiReports)
            .FirstOrDefaultAsync(x => x.Id == dataId, ct)
            ?? throw new KeyNotFoundException("KpiData 不存在");

        Ensure(!e.KpiReports.Any(), "此 KpiData 已有報告，不可刪除");

        _context.KpiDatas.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // =============== KpiReport ===============

    public async Task<IEnumerable<KpiReportAdminDto>> ListReportsAsync(int dataId, CancellationToken ct)
    {
        var exists = await _context.KpiDatas.AnyAsync(x => x.Id == dataId, ct);
        Ensure(exists, "KpiData 不存在");

        var rows = await _context.KpiReports
            .AsNoTracking()
            .Where(r => r.KpiDataId == dataId)
            .OrderBy(r => r.Year).ThenBy(r => r.Period)
            .Select(r => new KpiReportAdminDto(
                r.Id, r.Year, r.Period, r.KpiReportValue, r.IsSkipped, r.Remarks, (byte)r.Status, r.KpiDataId))
            .ToListAsync(ct);

        return rows;
    }

    public async Task<int> AddReportAsync(int dataId, KpiReportUpsertDto dto, CancellationToken ct)
    {
        var data = await _context.KpiDatas.FirstOrDefaultAsync(x => x.Id == dataId, ct)
            ?? throw new KeyNotFoundException("KpiData 不存在");

        var period = PeriodNormalize(dto.Period);
        Ensure(!string.IsNullOrWhiteSpace(period), "Period 必填");

        // 唯一鍵守護 (KpiDataId, Year, Period)
        var dup = await _context.KpiReports.AnyAsync(r => r.KpiDataId == dataId && r.Year == dto.Year && r.Period == period, ct);
        Ensure(!dup, "相同年度與期間的報告已存在");

        var e = new KpiReport
        {
            KpiDataId = dataId,
            Year = dto.Year,
            Period = period,
            KpiReportValue = dto.KpiReportValue,
            IsSkipped = dto.IsSkipped,
            Remarks = dto.Remarks,
            Status = ReportStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdateAt = DateTime.UtcNow
        };

        _context.KpiReports.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateReportAsync(int reportId, KpiReportUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.KpiReports.FirstOrDefaultAsync(x => x.Id == reportId, ct)
            ?? throw new KeyNotFoundException("KpiReport 不存在");

        var period = PeriodNormalize(dto.Period);
        Ensure(!string.IsNullOrWhiteSpace(period), "Period 必填");

        // 若更動 Year/Period 需檢查唯一
        var dup = await _context.KpiReports.AnyAsync(r =>
            r.Id != reportId && r.KpiDataId == e.KpiDataId && r.Year == dto.Year && r.Period == period, ct);
        Ensure(!dup, "相同年度與期間的報告已存在");

        e.Year = dto.Year;
        e.Period = period;
        e.KpiReportValue = dto.KpiReportValue;
        e.IsSkipped = dto.IsSkipped;
        e.Remarks = dto.Remarks;
        e.UpdateAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteReportAsync(int reportId, CancellationToken ct)
    {
        var e = await _context.KpiReports.FirstOrDefaultAsync(x => x.Id == reportId, ct)
            ?? throw new KeyNotFoundException("KpiReport 不存在");

        // Finalized 報告可選擇禁止刪除
        Ensure(e.Status != ReportStatus.Finalized, "Finalized 報告不可刪除");

        _context.KpiReports.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    public async Task ChangeReportStatusAsync(int reportId, byte newStatus, CancellationToken ct)
    {
        var e = await _context.KpiReports.FirstOrDefaultAsync(x => x.Id == reportId, ct)
            ?? throw new KeyNotFoundException("KpiReport 不存在");

        var ns = (ReportStatus)newStatus;

        if (!AllowedStatusFlows.TryGetValue(e.Status, out var nexts) || !nexts.Contains(ns))
            throw new InvalidOperationException($"不允許由 {e.Status} 轉為 {ns}");

        e.Status = ns;
        e.UpdateAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<KpiReportReviewDto>> GetKpiReportsForReviewAsync(
        byte? status, int? organizationId, string? orgName, string? field, int? year, string? period, int page, int pageSize, CancellationToken ct)
    {
        var query = _context.KpiReports
            .Include(r => r.KpiData)
                .ThenInclude(d => d.Organization)
            .Include(r => r.KpiData.DetailItem)
                .ThenInclude(di => di.KpiDetailItemNames)
            .Include(r => r.KpiData.DetailItem.KpiItem)
                .ThenInclude(i => i.KpiItemNames)
            .Include(r => r.KpiData.DetailItem.KpiItem)
                .ThenInclude(i => i.KpiField)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(r => (byte)r.Status == status.Value);
        if (organizationId.HasValue)
            query = query.Where(r => r.KpiData.OrganizationId == organizationId.Value);
        if (!string.IsNullOrWhiteSpace(orgName))
            query = query.Where(r => r.KpiData.Organization.Name.Contains(orgName));
        if (!string.IsNullOrWhiteSpace(field))
            query = query.Where(r => r.KpiData.DetailItem.KpiItem.KpiField.field.Contains(field));
        if (year.HasValue)
            query = query.Where(r => r.Year == year.Value);
        if (!string.IsNullOrWhiteSpace(period))
            query = query.Where(r => r.Period == period);

        var totalCount = await query.CountAsync(ct);

        var list = await query
            .OrderByDescending(r => r.UpdateAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = list.Select(r => new KpiReportReviewDto(
            r.Id,
            r.KpiDataId,
            r.KpiData?.OrganizationId,
            r.KpiData?.Organization?.Name,
            r.KpiData?.DetailItem?.KpiItem?.IndicatorNumber.ToString(),
            r.KpiData?.DetailItem?.KpiItem?.KpiItemNames
                .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name,
            r.KpiData?.DetailItem?.KpiDetailItemNames
                .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name,
            r.KpiData?.DetailItem?.KpiItem?.KpiField?.field,
            r.Year,
            r.Period,
            r.KpiReportValue,
            r.IsSkipped,
            r.Remarks,
            r.Status.ToString(),
            r.CreatedAt,
            r.UpdateAt
        )).ToList();

        return new PagedResult<KpiReportReviewDto>(items, page, pageSize, totalCount);
    }

    public async Task BatchChangeReportStatusAsync(IEnumerable<int> ids, byte newStatus, CancellationToken ct)
    {
        var ns = (ReportStatus)newStatus;
        var reports = await _context.KpiReports
            .Where(r => ids.Contains(r.Id))
            .ToListAsync(ct);

        foreach (var e in reports)
        {
            if (!AllowedStatusFlows.TryGetValue(e.Status, out var nexts) || !nexts.Contains(ns))
                continue;
            e.Status = ns;
            e.UpdateAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);
    }

    // 管理員強制退回已核准批次（繞過狀態機限制）
    public async Task<int> BatchRevokeFinalizedAsync(int year, string period, int? organizationId, CancellationToken ct)
    {
        var query = _context.KpiReports
            .Where(r => r.Status == ReportStatus.Finalized && r.Year == year && r.Period == period);

        if (organizationId.HasValue)
            query = query.Where(r => r.KpiData.OrganizationId == organizationId.Value);

        var reports = await query.ToListAsync(ct);

        foreach (var r in reports)
        {
            r.Status = ReportStatus.Returned;
            r.UpdateAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);
        return reports.Count;
    }

    public async Task<IEnumerable<PeriodMovePreviewItem>> GetPeriodMovePreviewAsync(int srcYear, string srcPeriod, CancellationToken ct)
    {
        var rows = await _context.KpiReports
            .Where(r => r.Year == srcYear && r.Period == srcPeriod)
            .Select(r => new
            {
                r.KpiData.OrganizationId,
                OrgName = r.KpiData.Organization != null ? r.KpiData.Organization.Name : "(未知)"
            })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => new { r.OrganizationId, r.OrgName })
            .Select(g => new PeriodMovePreviewItem(
                g.Key.OrganizationId ?? 0,
                g.Key.OrgName,
                g.Count()))
            .OrderBy(x => x.OrgName)
            .ToList();
    }

    public async Task<int> MovePeriodAsync(int srcYear, string srcPeriod, int dstYear, string dstPeriod, int[]? orgIds, CancellationToken ct)
    {
        // 找出目標期別已存在的 KpiDataId（避免 duplicate）
        var existingDstDataIds = await _context.KpiReports
            .Where(r => r.Year == dstYear && r.Period == dstPeriod)
            .Select(r => r.KpiDataId)
            .ToHashSetAsync(ct);

        var query = _context.KpiReports
            .Where(r => r.Year == srcYear && r.Period == srcPeriod);

        if (orgIds is { Length: > 0 })
            query = query.Where(r => r.KpiData.OrganizationId != null && orgIds.Contains(r.KpiData.OrganizationId.Value));

        var reports = await query.ToListAsync(ct);

        int moved = 0;
        foreach (var r in reports)
        {
            if (existingDstDataIds.Contains(r.KpiDataId))
                continue;   // 目標已有資料，跳過避免重複
            r.Year = dstYear;
            r.Period = dstPeriod;
            r.UpdateAt = DateTime.UtcNow;
            moved++;
        }

        if (moved > 0)
            await _context.SaveChangesAsync(ct);

        return moved;
    }

    public async Task<PagedResult<KpiDataListItemDto>> SearchKpiDataForCycleAsync(
        int? orgId, int? cycleId, bool noChycleOnly, string? q, int page, int pageSize, CancellationToken ct)
    {
        var query = _context.KpiDatas
            .Include(d => d.Organization)
            .Include(d => d.KpiCycle)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiDetailItemNames)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiItem).ThenInclude(i => i.KpiItemNames)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiItem).ThenInclude(i => i.KpiField)
            .AsQueryable();

        if (orgId.HasValue)
            query = query.Where(d => d.OrganizationId == orgId.Value);
        if (noChycleOnly)
            query = query.Where(d => d.KpiCycleId == null);
        else if (cycleId.HasValue)
            query = query.Where(d => d.KpiCycleId == cycleId.Value);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(d =>
                d.DetailItem.KpiItem.KpiField.field.Contains(q) ||
                d.DetailItem.KpiItem.KpiItemNames.Any(n => n.Name.Contains(q)) ||
                d.DetailItem.KpiDetailItemNames.Any(n => n.Name.Contains(q)) ||
                (d.Organization != null && d.Organization.Name.Contains(q)));

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(d => d.Organization != null ? d.Organization.Name : "")
            .ThenBy(d => d.DetailItem.KpiItem.KpiField.field)
            .ThenBy(d => d.DetailItem.KpiItem.IndicatorNumber)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .AsNoTracking()
            .ToListAsync(ct);

        var dtos = items.Select(d =>
        {
            var itemName   = d.DetailItem?.KpiItem?.KpiItemNames.OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "";
            var detailName = d.DetailItem?.KpiDetailItemNames.OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "";
            return new KpiDataListItemDto(
                d.Id,
                d.OrganizationId, d.Organization?.Name,
                d.KpiCycleId, d.KpiCycle?.CycleName,
                d.DetailItem?.KpiItem?.KpiField?.field ?? "",
                d.DetailItem?.KpiItem?.IndicatorNumber ?? 0,
                itemName, detailName,
                d.DetailItem?.Unit ?? "",
                d.ProductionSite,
                d.BaselineYear ?? "",
                d.BaselineValue, d.TargetValue,
                _context.KpiReports.Count(r => r.KpiDataId == d.Id));
        }).ToList();

        return new PagedResult<KpiDataListItemDto>(dtos, page, pageSize, total);
    }

    public async Task<int> BatchReassignCycleAsync(int[] kpiDataIds, int? newCycleId, CancellationToken ct)
    {
        if (newCycleId.HasValue)
        {
            var cycleExists = await _context.KpiCycles.AnyAsync(c => c.Id == newCycleId.Value, ct);
            Ensure(cycleExists, $"週期 ID {newCycleId} 不存在");
        }

        var records = await _context.KpiDatas
            .Where(d => kpiDataIds.Contains(d.Id))
            .ToListAsync(ct);

        foreach (var d in records)
            d.KpiCycleId = newCycleId;

        await _context.SaveChangesAsync(ct);
        return records.Count;
    }

    public async Task<byte[]> ExportKpiHistoryToExcelAsync(int[] orgIds, CancellationToken ct)
    {
        var orgNames = await _context.Organizations
            .Where(o => orgIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, o => o.Name, ct);

        // Load KpiData with all includes (reports loaded via KpiReports nav)
        var allKpiDatas = await _context.KpiDatas
            .Include(d => d.KpiCycle)
            .Include(d => d.KpiReports)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiDetailItemNames)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiItem).ThenInclude(i => i.KpiItemNames)
            .Include(d => d.DetailItem).ThenInclude(di => di.KpiItem).ThenInclude(i => i.KpiField)
            .Where(d => d.OrganizationId.HasValue && orgIds.Contains(d.OrganizationId.Value))
            .AsNoTracking()
            .ToListAsync(ct);

        var workbook = new XSSFWorkbook();

        var fixedHdrStyle  = ExcelStyle(workbook, bold: true, bg: new byte[] { 68, 114, 196 });
        var cycleHdrStyle  = ExcelStyle(workbook, bold: true, bg: new byte[] { 84, 130, 53 });
        var subHdrStyle    = ExcelStyle(workbook, bold: true, bg: new byte[] { 169, 208, 142 });

        const int FixedCols = 6;
        string[] fixedHeaders = { "指標領域", "指標編號", "指標名稱", "細項名稱", "單位", "工場/製程區" };

        foreach (var orgId in orgIds)
        {
            var orgData = allKpiDatas.Where(d => d.OrganizationId == orgId).ToList();
            var sheetName = ExcelSheetName(orgNames.TryGetValue(orgId, out var nn) ? nn : $"Org{orgId}");
            var sheet = workbook.CreateSheet(sheetName);

            // ── 計算週期群組 ──────────────────────────────────────────────
            // 每個「週期群組」 = (CycleId?, CycleName, 該週期下所有填報的 年+季 清單)
            var cycles = orgData
                .Where(d => d.KpiCycle != null)
                .Select(d => d.KpiCycle!)
                .DistinctBy(c => c.Id)
                .OrderBy(c => c.StartYear)
                .ToList();

            var groups = cycles
                .Select(c => (
                    CycleId: (int?)c.Id,
                    CycleName: c.CycleName,
                    Periods: orgData
                        .Where(d => d.KpiCycleId == c.Id)
                        .SelectMany(d => d.KpiReports)
                        .Select(r => (r.Year, r.Period))
                        .Distinct()
                        .OrderBy(x => x.Year).ThenBy(x => KpiPeriodOrder(x.Period))
                        .ToList()))
                .ToList();

            // 未指定週期的資料另為一組
            var noCyclePeriods = orgData
                .Where(d => d.KpiCycle == null)
                .SelectMany(d => d.KpiReports)
                .Select(r => (r.Year, r.Period))
                .Distinct()
                .OrderBy(x => x.Year).ThenBy(x => KpiPeriodOrder(x.Period))
                .ToList();
            if (noCyclePeriods.Count > 0)
                groups.Add((null, "(未指定週期)", noCyclePeriods));

            // ── 第 0 列：週期群組標頭（橫向合併）+ 固定欄位（縱向合併）─────
            var hdr0 = sheet.CreateRow(0);
            for (int i = 0; i < FixedCols; i++)
            {
                var c = hdr0.CreateCell(i);
                c.SetCellValue(fixedHeaders[i]);
                c.CellStyle = fixedHdrStyle;
                sheet.AddMergedRegion(new CellRangeAddress(0, 1, i, i)); // 縱向合併 row0-1
            }

            int col = FixedCols;
            foreach (var grp in groups)
            {
                int grpCols = 4 + grp.Periods.Count * 2; // 基準年/值/目標值/比較方式 + 各期(填報值+備註)
                var c = hdr0.CreateCell(col);
                c.SetCellValue(grp.CycleName);
                c.CellStyle = cycleHdrStyle;
                if (grpCols > 1)
                    sheet.AddMergedRegion(new CellRangeAddress(0, 0, col, col + grpCols - 1));
                // 合併區域內的其他格子也要建立（否則 NPOI 某些版本會警告）
                for (int x = 1; x < grpCols; x++)
                    hdr0.CreateCell(col + x).CellStyle = cycleHdrStyle;
                col += grpCols;
            }

            // ── 第 1 列：細部標頭（基準年/值、目標值、比較、各期）──────────
            var hdr1 = sheet.CreateRow(1);
            col = FixedCols;
            foreach (var grp in groups)
            {
                void S(string v) { var c = hdr1.CreateCell(col++); c.SetCellValue(v); c.CellStyle = subHdrStyle; }
                S("基準年"); S("基準值"); S("目標值"); S("比較方式");
                foreach (var (yr, per) in grp.Periods)
                { S($"{yr}{per}"); S($"{yr}{per}備註"); }
            }

            // ── 查找表 ──────────────────────────────────────────────────
            // (DetailItemId, ProductionSite, CycleId?) → KpiData
            var kpiDataLookup = orgData
                .GroupBy(d => (d.DetailItemId, PS: d.ProductionSite ?? "", Cid: d.KpiCycleId))
                .ToDictionary(g => g.Key, g => g.First());

            // KpiDataId → { (Year,Period) → KpiReport }
            var reportMap = orgData.ToDictionary(
                d => d.Id,
                d => d.KpiReports.ToDictionary(r => (r.Year, r.Period), r => r));

            // ── 資料列：每個 (細項, 製程區) 一列 ─────────────────────────
            var rowKeys = orgData
                .Select(d => (d.DetailItemId, PS: d.ProductionSite ?? ""))
                .Distinct()
                .OrderBy(x =>
                {
                    var d = orgData.First(dd => dd.DetailItemId == x.DetailItemId);
                    return d.DetailItem?.KpiItem?.KpiField?.field ?? "";
                })
                .ThenBy(x =>
                {
                    var d = orgData.First(dd => dd.DetailItemId == x.DetailItemId);
                    return d.DetailItem?.KpiItem?.IndicatorNumber ?? 0;
                })
                .ThenBy(x => x.PS)
                .ToList();

            int rowIdx = 2;
            foreach (var (detailItemId, ps) in rowKeys)
            {
                var row = sheet.CreateRow(rowIdx++);
                var sample = orgData.First(d => d.DetailItemId == detailItemId && (d.ProductionSite ?? "") == ps);
                var di   = sample.DetailItem;
                var item = di?.KpiItem;

                row.CreateCell(0).SetCellValue(item?.KpiField?.field ?? "");
                row.CreateCell(1).SetCellValue(item?.IndicatorNumber.ToString() ?? "");
                row.CreateCell(2).SetCellValue(item?.KpiItemNames.OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "");
                row.CreateCell(3).SetCellValue(di?.KpiDetailItemNames.OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "");
                row.CreateCell(4).SetCellValue(di?.Unit ?? "");
                row.CreateCell(5).SetCellValue(ps);

                col = FixedCols;
                foreach (var grp in groups)
                {
                    var key = (detailItemId, PS: ps, Cid: grp.CycleId);
                    if (kpiDataLookup.TryGetValue(key, out var kd))
                    {
                        row.CreateCell(col++).SetCellValue(kd.BaselineYear ?? "");
                        if (kd.BaselineValue.HasValue) row.CreateCell(col).SetCellValue((double)kd.BaselineValue.Value);
                        col++;
                        if (kd.TargetValue.HasValue) row.CreateCell(col).SetCellValue((double)kd.TargetValue.Value);
                        col++;
                        row.CreateCell(col++).SetCellValue(di?.ComparisonOperator ?? "");

                        reportMap.TryGetValue(kd.Id, out var reports);
                        foreach (var (yr, per) in grp.Periods)
                        {
                            if (reports != null && reports.TryGetValue((yr, per), out var rpt))
                            {
                                var c = row.CreateCell(col);
                                if (rpt.IsSkipped)          c.SetCellValue("不適用");
                                else if (rpt.KpiReportValue.HasValue) c.SetCellValue((double)rpt.KpiReportValue.Value);
                                col++;
                                row.CreateCell(col).SetCellValue(rpt.Remarks ?? "");
                            }
                            else
                            {
                                col++;
                            }
                            col++;
                        }
                    }
                    else
                    {
                        col += 4 + grp.Periods.Count * 2;
                    }
                }
            }

            // ── 欄寬 ────────────────────────────────────────────────────
            int[] fw = { 3500, 2800, 7000, 7000, 2500, 4000 };
            for (int i = 0; i < fw.Length; i++) sheet.SetColumnWidth(i, fw[i]);
            col = FixedCols;
            foreach (var grp in groups)
            {
                sheet.SetColumnWidth(col++, 2800); // 基準年
                sheet.SetColumnWidth(col++, 2800); // 基準值
                sheet.SetColumnWidth(col++, 2800); // 目標值
                sheet.SetColumnWidth(col++, 2500); // 比較方式
                foreach (var _ in grp.Periods)
                {
                    sheet.SetColumnWidth(col++, 2800); // 填報值
                    sheet.SetColumnWidth(col++, 5000); // 備註
                }
            }
        }

        using var ms = new MemoryStream();
        workbook.Write(ms);
        return ms.ToArray();
    }

    private static ICellStyle ExcelStyle(IWorkbook wb, bool bold, byte[] bg)
    {
        var style = wb.CreateCellStyle();
        var font = wb.CreateFont();
        font.IsBold = bold;
        style.SetFont(font);
        ((XSSFCellStyle)style).SetFillForegroundColor(new XSSFColor(bg));
        style.FillPattern = FillPattern.SolidForeground;
        style.BorderBottom = BorderStyle.Thin;
        style.BorderRight  = BorderStyle.Thin;
        return style;
    }

    private static int KpiPeriodOrder(string p) => p switch
    {
        "Q1" => 1, "Q2" => 2, "Q3" => 3, "Q4" => 4,
        "H1" => 5, "H2" => 6, "Y"  => 7, _    => 99
    };

    private static string ExcelSheetName(string name)
    {
        var clean = new string(name
            .Replace(":", "").Replace("\\", "").Replace("/", "")
            .Replace("?", "").Replace("*", "").Replace("[", "").Replace("]", "")
            .Take(31).ToArray());
        return string.IsNullOrEmpty(clean) ? "Sheet1" : clean;
    }

    public async Task<IEnumerable<KpiCycleDto>> ListCyclesAsync(CancellationToken ct)
    {
        return await _context.KpiCycles
            .OrderByDescending(c => c.EndYear)
            .ThenBy(c => c.StartYear)
            .Select(c => new KpiCycleDto(c.Id, c.CycleName, c.StartYear, c.EndYear))
            .ToListAsync(ct);
    }

    public async Task<int> CreateCycleAsync(KpiCycleUpsertDto dto, CancellationToken ct)
    {
        Ensure(dto.EndYear >= dto.StartYear, "EndYear 必須 ≥ StartYear");
        var e = new KpiCycle
        {
            CycleName = dto.Name.Trim(),
            StartYear = dto.StartYear,
            EndYear = dto.EndYear,
            CreateTime = DateTime.UtcNow
        };
        _context.KpiCycles.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateCycleAsync(int id, KpiCycleUpsertDto dto, CancellationToken ct)
    {
        Ensure(dto.EndYear >= dto.StartYear, "EndYear 必須 ≥ StartYear");
        var e = await _context.KpiCycles.FindAsync([id], ct);
        Ensure(e != null, "KpiCycle 不存在");

        e.CycleName = dto.Name.Trim();
        e.StartYear = dto.StartYear;
        e.EndYear = dto.EndYear;
        e.UploadTime = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteCycleAsync(int id, CancellationToken ct)
    {
        var used = await _context.KpiDatas.AnyAsync(d => d.KpiCycleId == id, ct);
        Ensure(!used, "此 KpiCycle 已被 KpiData 使用，無法刪除");

        var e = await _context.KpiCycles.FindAsync([id], ct);
        Ensure(e != null, "KpiCycle 不存在");
        _context.KpiCycles.Remove(e!);
        await _context.SaveChangesAsync(ct);
    }
    
    // ============ 下拉 ============

    public async Task<List<SuggestEventTypeDto>> ListEventTypesAsync(CancellationToken ct)
        => await _context.SuggestEventTypes
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .Select(x => new SuggestEventTypeDto(x.Id, x.Name))
            .ToListAsync(ct);

    public async Task<List<SuggestionTypeDto>> ListSuggestionTypesAsync(CancellationToken ct)
        => await _context.SuggestionTypes
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Id)
            .Select(x => new SuggestionTypeDto(x.Id, x.Name))
            .ToListAsync(ct);
    

    public Task<List<IsAdoptedOption>> ListIsAdoptedOptionsAsync()
    {
        var list = Enum.GetValues(typeof(IsAdopted))
            .Cast<IsAdopted>()
            .Select(e => new IsAdoptedOption((byte)e, e.ToString()))
            .ToList();
        return Task.FromResult(list);
    }

    // ============ SuggestDate ============

    public async Task<PagedResult<SuggestDateRowDto>> SearchSuggestDatesAsync(
        int page, int pageSize, int? orgId, int? eventTypeId, int? year, CancellationToken ct)
    {
        var q = _context.SuggestDates
            .AsNoTracking()
            .Include(x => x.SuggestEventType)
            .Include(x => x.Organization)
            .Include(x => x.SuggestReports)
            .AsQueryable();

        if (orgId.HasValue) q = q.Where(x => x.OrganizationId == orgId);
        if (eventTypeId.HasValue) q = q.Where(x => x.SuggestEventTypeId == eventTypeId);
        if (year.HasValue) q = q.Where(x => x.Date.Year == year);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.Date)
            .ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new SuggestDateRowDto(
                x.Id,
                x.Date,
                x.SuggestEventTypeId,
                x.SuggestEventType.Name,
                x.OrganizationId,
                x.Organization != null ? x.Organization.Name : null,
                x.SuggestReports.Count,
                x.CreatedAt
            ))
            .ToListAsync(ct);

        return new PagedResult<SuggestDateRowDto>(items, page, pageSize, total);
    }

    public async Task<SuggestDateDetailDto> GetSuggestDateAsync(int id, CancellationToken ct)
    {
        var e = await _context.SuggestDates
            .Include(x => x.SuggestEventType)
            .Include(x => x.Organization)
            .Include(x => x.SuggestReports).ThenInclude(r => r.SuggestionType)
            .Include(x => x.SuggestReports).ThenInclude(r => r.KpiField)
            .Include(x => x.SuggestReports).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("指定的督導日期不存在");

        var reports = e.SuggestReports
            .OrderBy(r => r.Id)
            .Select(r => new SuggestReportRowDto(
                r.Id,
                r.SuggestDateId,
                r.SuggestionTypeId,
                r.SuggestionType.Name,
                r.SuggestionContent,
                (byte?)r.IsAdopted,
                r.IsAdoptedOther,
                r.RespDept,
                r.ImproveDetails,
                r.Manpower,
                r.Budget,
                (byte?)r.Completed,
                r.CompletedOther,
                r.DoneYear,
                r.DoneMonth,
                (byte?)r.ParallelExec,
                r.ParallelExecOther,
                r.ExecPlan,
                r.Remark,
                r.KpiFieldId,
                r.KpiField != null ? r.KpiField.field : null,
                r.UserId,
                r.User != null ? r.User.Nickname : null,
                r.CreatedAt,
                r.UpdateAt
            ))
            .ToList();

        return new SuggestDateDetailDto(
            e.Id,
            e.Date,
            e.SuggestEventTypeId,
            e.SuggestEventType.Name,
            e.OrganizationId,
            e.Organization != null ? e.Organization.Name : null,
            reports,
            e.CreatedAt,
            e.UpdateAt
        );
    }

    public async Task<int> CreateSuggestDateAsync(SuggestDateUpsertDto dto, CancellationToken ct)
    {
        if (!await _context.SuggestEventTypes.AnyAsync(x => x.Id == dto.SuggestEventTypeId && x.IsActive, ct))
            throw new InvalidOperationException("SuggestEventType 不存在或未啟用");

        if (dto.OrganizationId.HasValue &&
            !await _context.Organizations.AnyAsync(x => x.Id == dto.OrganizationId.Value, ct))
            throw new InvalidOperationException("Organization 不存在");

        var now = tool.GetTaiwanNow();
        var e = new SuggestDate
        {
            Date = dto.Date.Date,
            SuggestEventTypeId = dto.SuggestEventTypeId,
            OrganizationId = dto.OrganizationId,
            CreatedAt = now
        };

        _context.SuggestDates.Add(e);
        await _context.SaveChangesAsync(ct);
        return e.Id;
    }

    public async Task UpdateSuggestDateAsync(int id, SuggestDateUpsertDto dto, CancellationToken ct)
    {
        var e = await _context.SuggestDates.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("指定的督導日期不存在");

        if (!await _context.SuggestEventTypes.AnyAsync(x => x.Id == dto.SuggestEventTypeId && x.IsActive, ct))
            throw new InvalidOperationException("SuggestEventType 不存在或未啟用");

        if (dto.OrganizationId.HasValue &&
            !await _context.Organizations.AnyAsync(x => x.Id == dto.OrganizationId.Value, ct))
            throw new InvalidOperationException("Organization 不存在");

        e.Date = dto.Date.Date;
        e.SuggestEventTypeId = dto.SuggestEventTypeId;
        e.OrganizationId = dto.OrganizationId;
        e.UpdateAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteSuggestDateAsync(int id, CancellationToken ct)
    {
        var e = await _context.SuggestDates
            .Include(x => x.SuggestReports)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("指定的督導日期不存在");

        _context.SuggestReports.RemoveRange(e.SuggestReports);
        _context.SuggestDates.Remove(e);
        await _context.SaveChangesAsync(ct);
    }

    // ============ SuggestReport ============

    public async Task<List<SuggestReportRowDto>> ListReportsByDateAsync(int suggestDateId, CancellationToken ct)
    {
        return await _context.SuggestReports
            .AsNoTracking()
            .Where(x => x.SuggestDateId == suggestDateId)
            .Include(x => x.SuggestionType)
            .Include(x => x.KpiField)
            .Include(x => x.User)
            .OrderBy(x => x.Id)
            .Select(r => new SuggestReportRowDto(
                r.Id,
                r.SuggestDateId,
                r.SuggestionTypeId,
                r.SuggestionType.Name,
                r.SuggestionContent,
                (byte?)r.IsAdopted,
                r.IsAdoptedOther,
                r.RespDept,
                r.ImproveDetails,
                r.Manpower,
                r.Budget,
                (byte?)r.Completed,
                r.CompletedOther,
                r.DoneYear,
                r.DoneMonth,
                (byte?)r.ParallelExec,
                r.ParallelExecOther,
                r.ExecPlan,
                r.Remark,
                r.KpiFieldId,
                r.KpiField != null ? r.KpiField.field : null,
                r.UserId,
                r.User != null ? r.User.Nickname : null,
                r.CreatedAt,
                r.UpdateAt
            ))
            .ToListAsync(ct);
    }

    public async Task<SuggestReportRowDto> GetReportAsync(int id, CancellationToken ct)
    {
        var r = await _context.SuggestReports
            .Include(x => x.SuggestionType)
            .Include(x => x.KpiField)
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("指定的報告不存在");

        return new SuggestReportRowDto(
            r.Id, r.SuggestDateId, r.SuggestionTypeId, r.SuggestionType.Name,
            r.SuggestionContent,
            (byte?)r.IsAdopted, r.IsAdoptedOther, r.RespDept, r.ImproveDetails,
            r.Manpower, r.Budget,
            (byte?)r.Completed, r.CompletedOther, r.DoneYear, r.DoneMonth,
            (byte?)r.ParallelExec, r.ParallelExecOther,
            r.ExecPlan, r.Remark,
            r.KpiFieldId, r.KpiField?.field,
            r.UserId, r.User?.Nickname,
            r.CreatedAt, r.UpdateAt
        );
    }

    public async Task<int> CreateReportAsync(int suggestDateId, SuggestReportUpsertDto dto, Guid userId, CancellationToken ct)
    {
        if (!await _context.SuggestDates.AnyAsync(x => x.Id == suggestDateId, ct))
            throw new InvalidOperationException("SuggestDate 不存在");

        if (!await _context.SuggestionTypes.AnyAsync(x => x.Id == dto.SuggestionTypeId && x.IsActive, ct))
            throw new InvalidOperationException("SuggestionType 不存在或未啟用");

        if (dto.KpiFieldId.HasValue && !await _context.KpiFields.AnyAsync(x => x.Id == dto.KpiFieldId.Value, ct))
            throw new InvalidOperationException("KpiField 不存在");

        var now = tool.GetTaiwanNow();
        var r = new SuggestReport
        {
            SuggestDateId = suggestDateId,
            SuggestionTypeId = dto.SuggestionTypeId,
            SuggestionContent = dto.SuggestionContent,
            IsAdopted = dto.IsAdopted.HasValue ? (IsAdopted?)dto.IsAdopted.Value : null,
            IsAdoptedOther = dto.IsAdoptedOther,
            RespDept = dto.RespDept,
            ImproveDetails = dto.ImproveDetails,
            Manpower = dto.Manpower,
            Budget = dto.Budget,
            Completed = dto.Completed.HasValue ? (IsAdopted?)dto.Completed.Value : null,
            CompletedOther = dto.CompletedOther,
            DoneYear = dto.DoneYear,
            DoneMonth = dto.DoneMonth,
            ParallelExec = dto.ParallelExec.HasValue ? (IsAdopted?)dto.ParallelExec.Value : null,
            ParallelExecOther = dto.ParallelExecOther,
            ExecPlan = dto.ExecPlan,
            Remark = dto.Remark,
            KpiFieldId = dto.KpiFieldId,
            UserId = userId,
            CreatedAt = now
        };

        _context.SuggestReports.Add(r);
        await _context.SaveChangesAsync(ct);
        return r.Id;
    }

    public async Task UpdateReportAsync(int id, SuggestReportUpsertDto dto, CancellationToken ct)
    {
        var r = await _context.SuggestReports.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("指定的報告不存在");

        if (!await _context.SuggestionTypes.AnyAsync(x => x.Id == dto.SuggestionTypeId && x.IsActive, ct))
            throw new InvalidOperationException("SuggestionType 不存在或未啟用");

        if (dto.KpiFieldId.HasValue && !await _context.KpiFields.AnyAsync(x => x.Id == dto.KpiFieldId.Value, ct))
            throw new InvalidOperationException("KpiField 不存在");

        r.SuggestionTypeId = dto.SuggestionTypeId;
        r.SuggestionContent = dto.SuggestionContent;
        r.IsAdopted = dto.IsAdopted.HasValue ? (IsAdopted?)dto.IsAdopted.Value : null;
        r.IsAdoptedOther = dto.IsAdoptedOther;
        r.RespDept = dto.RespDept;
        r.ImproveDetails = dto.ImproveDetails;
        r.Manpower = dto.Manpower;
        r.Budget = dto.Budget;
        r.Completed = dto.Completed.HasValue ? (IsAdopted?)dto.Completed.Value : null;
        r.CompletedOther = dto.CompletedOther;
        r.DoneYear = dto.DoneYear;
        r.DoneMonth = dto.DoneMonth;
        r.ParallelExec = dto.ParallelExec.HasValue ? (IsAdopted?)dto.ParallelExec.Value : null;
        r.ParallelExecOther = dto.ParallelExecOther;
        r.ExecPlan = dto.ExecPlan;
        r.Remark = dto.Remark;
        r.KpiFieldId = dto.KpiFieldId;
        r.UpdateAt = tool.GetTaiwanNow();

        await _context.SaveChangesAsync(ct);
    }

    // ============ 跨日期檢索（儀表板/統計） ============

    public async Task<PagedResult<SuggestReportRowDto>> SearchReportsAsync(
        int page, int pageSize, int? orgId, int? suggestionTypeId, int? kpiFieldId, int? year, string? q, CancellationToken ct)
    {
        var query = _context.SuggestReports
            .AsNoTracking()
            .Include(x => x.SuggestDate).ThenInclude(d => d.Organization)
            .Include(x => x.SuggestionType)
            .Include(x => x.KpiField)
            .Include(x => x.User)
            .AsQueryable();

        if (orgId.HasValue) query = query.Where(r => r.SuggestDate.OrganizationId == orgId);
        if (suggestionTypeId.HasValue) query = query.Where(r => r.SuggestionTypeId == suggestionTypeId);
        if (kpiFieldId.HasValue) query = query.Where(r => r.KpiFieldId == kpiFieldId);
        if (year.HasValue) query = query.Where(r => r.SuggestDate.Date.Year == year);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var kw = q.Trim();
            query = query.Where(r =>
                r.SuggestionContent.Contains(kw) ||
                (r.ImproveDetails ?? "").Contains(kw) ||
                (r.ExecPlan ?? "").Contains(kw) ||
                (r.Remark ?? "").Contains(kw));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.SuggestDate.Date)
            .ThenBy(r => r.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new SuggestReportRowDto(
                r.Id, r.SuggestDateId,
                r.SuggestionTypeId, r.SuggestionType.Name,
                r.SuggestionContent, (byte?)r.IsAdopted, r.IsAdoptedOther,
                r.RespDept, r.ImproveDetails, r.Manpower, r.Budget,
                (byte?)r.Completed, r.CompletedOther, r.DoneYear, r.DoneMonth,
                (byte?)r.ParallelExec, r.ParallelExecOther,
                r.ExecPlan, r.Remark,
                r.KpiFieldId, r.KpiField != null ? r.KpiField.field : null,
                r.UserId, r.User != null ? r.User.Nickname : null,
                r.CreatedAt, r.UpdateAt))
            .ToListAsync(ct);

        return new PagedResult<SuggestReportRowDto>(items, page, pageSize, total);
    }
}