using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Authorize]
[Route("Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ISHAuditDbcontext _db;

    public AdminController(IAdminService adminService, IEmailService emailService, IConfiguration configuration, ISHAuditDbcontext db)
    {
        _adminService = adminService;
        _emailService = emailService;
        _configuration = configuration;
        _db = db;
    }
    
    // ======= 角色管理 =======
    
    
    [HttpGet("roles")]
    public async Task<ActionResult<string[]>> GetRoles(CancellationToken ct)
        => Ok(await _adminService.GetRolesAsync(ct));

    public record CreateRoleReq(string Name);
    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleReq req, CancellationToken ct)
    {
        await _adminService.CreateRoleAsync(req?.Name ?? "", ct);
        return NoContent();
    }

    public record RenameRoleReq(string NewName);
    [HttpPatch("roles/{name}")]
    public async Task<IActionResult> RenameRole([FromRoute] string name, [FromBody] RenameRoleReq req, CancellationToken ct)
    {
        await _adminService.RenameRoleAsync(name, req?.NewName ?? "", ct);
        return NoContent();
    }

    [HttpDelete("roles/{name}")]
    public async Task<IActionResult> DeleteRole([FromRoute] string name, CancellationToken ct)
    {
        await _adminService.DeleteRoleAsync(name, ct);
        return NoContent();
    }
    
    // ======= 既有矩陣/權限 =======
    /// <summary>
    /// 取得權限矩陣（角色清單 + 每個 permission 的 grants）
    /// </summary>
    [HttpGet("matrix")]
    public async Task<ActionResult<PermissionMatrixDto>> GetMatrix(CancellationToken ct)
    {
        var result = await _adminService.GetMatrixAsync(ct);
        return Ok(result);
    }

    /// <summary>
    /// 新增或更新單一 Permission（僅 key/label）
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertPermissionDto dto, CancellationToken ct)
    {
        await _adminService.UpsertPermissionAsync(dto, ct);
        return NoContent();
    }

    /// <summary>
    /// 刪除單一 Permission（會連動刪除對應 RolePermission）
    /// </summary>
    [HttpDelete("{key}")]
    public async Task<IActionResult> Delete(string key, CancellationToken ct)
    {
        await _adminService.DeletePermissionAsync(key, ct);
        return NoContent();
    }

    /// <summary>
    /// 儲存整個矩陣（差異化更新 RolePermission，並 upsert Permission 描述）
    /// </summary>
    [HttpPost("matrix")]
    public async Task<IActionResult> SaveMatrix([FromBody] SavePermissionMatrixRequest req, CancellationToken ct)
    {
        await _adminService.SaveMatrixAsync(req, ct);
        return NoContent();
    }
    
    
    // ======= 使用者管理 =======
    // 取得使用者詳情
    [HttpGet("users/{id:guid}")]
    public async Task<ActionResult<UserDetailDto>> GetUserDetail(Guid id, CancellationToken ct)
    {
        var detail = await _adminService.GetUserDetailAsync(id, ct);
        return detail is null ? NotFound() : Ok(detail);
    }

    // 查詢使用者清單
    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<UserListItemDto>>> SearchUsers([FromQuery] UserListQueryDto query, CancellationToken ct)
        => Ok(await _adminService.SearchUsersAsync(query, ct));

    // 修改使用者
    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto2 dto, CancellationToken ct)
    {
        await _adminService.UpdateUserAsync(id, dto, ct);
        return NoContent();
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser([FromRoute] Guid id, CancellationToken ct)
    {
        await _adminService.DeleteUserAsync(id, ct);
        return NoContent();
    }
    
    // 啟用/停用
    [HttpPatch("users/{id:guid}/active")]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] SetActiveDto dto, CancellationToken ct)
    {
        await _adminService.SetActiveAsync(id, dto.IsActive, ct);
        return NoContent();
    }

    // Email 驗證狀態
    public record SetEmailVerifiedDto(bool EmailVerified);
    [HttpPatch("users/{id:guid}/email-verified")]
    public async Task<IActionResult> SetEmailVerified(Guid id, [FromBody] SetEmailVerifiedDto dto, CancellationToken ct)
    {
        await _adminService.SetEmailVerifiedAsync(id, dto.EmailVerified, ct);
        return NoContent();
    }

    // 解除帳號鎖定
    [HttpPost("users/{id:guid}/unlock")]
    public async Task<IActionResult> UnlockAccount(Guid id, CancellationToken ct)
    {
        await _adminService.UnlockAccountAsync(id, ct);
        return NoContent();
    }

    // 修改角色
    [HttpPut("users/{id:guid}/roles")]
    public async Task<IActionResult> SetRoles(Guid id, [FromBody] SetRolesDto dto, CancellationToken ct)
    {
        await _adminService.SetRolesAsync(id, dto.Roles, ct);
        return NoContent();
    }

    // 變更所屬機構
    public record SetOrganizationDto(int OrganizationId);
    [HttpPatch("users/{id:guid}/organization")]
    public async Task<IActionResult> SetOrganization(Guid id, [FromBody] SetOrganizationDto dto, CancellationToken ct)
    {
        await _adminService.SetOrganizationAsync(id, dto.OrganizationId, ct);
        return NoContent();
    }
    
    // 開通 Forma 表單系統帳號
    [HttpPost("users/{id:guid}/provision-forma")]
    public async Task<IActionResult> ProvisionForma(Guid id, CancellationToken ct)
    {
        try
        {
            await _adminService.ProvisionFormaAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = $"無法連線至表單系統：{ex.Message}" });
        }
    }

    // 一次性同步所有已開通使用者的單位與職稱至 Forma
    [HttpPost("users/sync-forma")]
    public async Task<IActionResult> SyncFormaUsers(CancellationToken ct)
    {
        try
        {
            var count = await _adminService.SyncFormaUsersAsync(ct);
            return Ok(new { updated = count });
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(502, new { message = $"無法連線至表單系統：{ex.Message}" });
        }
    }

    // 寄送帳號開通通知信
    [HttpPost("users/{id:guid}/send-activation-email")]
    public async Task<IActionResult> SendActivationEmail(Guid id, CancellationToken ct)
    {
        var user = await _adminService.GetUserDetailAsync(id, ct);
        if (user is null) return NotFound();
        if (string.IsNullOrWhiteSpace(user.Email)) return BadRequest(new { message = "該使用者尚未設定 Email" });

        var loginUrl = _configuration["FrontendUrl"] ?? "/";
        await _emailService.SendActivationEmailAsync(user.Email, user.Nickname ?? user.Username, loginUrl);
        return NoContent();
    }

    // ======= 日誌管理 =======
    [HttpGet("data-change-logs")]
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _adminService.GetLogsAsync(q, page, pageSize, ct);
        return Ok(result);
    }
    
    [HttpGet("login-logs")]
    public async Task<IActionResult> GetLoginLogs(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var query = _db.LoginLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(l =>
                (l.UserEmail != null && l.UserEmail.Contains(q)) ||
                (l.ClientIp != null && l.ClientIp.Contains(q)));
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(l => l.OccurredAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return Ok(new { items, total, page, pageSize });
    }

    // ======= 組織管理 =======
    [HttpGet("org/tree")]
    public async Task<ActionResult<List<OrgTreeNodeDto>>> GetOrgTree(CancellationToken ct)
        => Ok(await _adminService.GetOrgTreeAsync(ct));

    [HttpGet("org/{id:int}")]
    public async Task<ActionResult<Organization>> GetOrgById([FromRoute] int id, CancellationToken ct)
    {
        var org = await _adminService.GetOrgAsync(id, ct);
        return org is null ? NotFound() : Ok(org);
    }

    [HttpPost("org")]
    public async Task<IActionResult> CreateOrg([FromBody] OrgUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateOrgAsync(dto, ct);
        return CreatedAtAction(nameof(GetOrgById), new { id }, new { id });
    }

    [HttpPut("org/{id:int}")]
    public async Task<IActionResult> UpdateOrg([FromRoute] int id, [FromBody] OrgUpsertDto dto, CancellationToken ct)
    {
        await _adminService.UpdateOrgAsync(id, dto, ct);
        return NoContent();
    }

    [HttpPatch("org/{id:int}/move")]
    public async Task<IActionResult> MoveOrg([FromRoute] int id, [FromBody] MoveParentDto dto, CancellationToken ct)
    {
        await _adminService.MoveOrgAsync(id, dto.NewParentId, ct);
        return NoContent();
    }

    [HttpDelete("org/{id:int}")]
    public async Task<IActionResult> DeleteOrg([FromRoute] int id, CancellationToken ct)
    {
        try
        {
            await _adminService.DeleteOrgAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    // ======= 組織「類型」 APIs =======
    public record OrgTypeDto(int Id, string TypeCode, string TypeName, string? Description, bool CanHaveChildren);
    public record OrgTypeUpsertDto(string TypeCode, string TypeName, string? Description, bool CanHaveChildren);
    [HttpGet("org/types")]
    public async Task<ActionResult<IEnumerable<OrgTypeDto>>> GetOrgTypes(CancellationToken ct)
        => Ok(await _adminService.GetOrgTypesAsync(ct));

    [HttpPost("org/types")]
    public async Task<IActionResult> CreateOrgType([FromBody] OrgTypeUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateOrgTypeAsync(dto, ct);
        return CreatedAtAction(nameof(GetOrgTypes), new { id }, new { id });
    }

    [HttpPut("org/types/{id:int}")]
    public async Task<IActionResult> UpdateOrgType([FromRoute] int id, [FromBody] OrgTypeUpsertDto dto, CancellationToken ct)
    {
        await _adminService.UpdateOrgTypeAsync(id, dto, ct);
        return NoContent();
    }

    [HttpDelete("org/types/{id:int}")]
    public async Task<IActionResult> DeleteOrgType([FromRoute] int id, CancellationToken ct)
    {
        await _adminService.DeleteOrgTypeAsync(id, ct);
        return NoContent();
    }


    // ======= 組織「階層規則」 APIs =======
    public record HierRuleDto(int Id, int ParentTypeId, int ChildTypeId, bool IsRequired, int? MaxChildren);
    public record HierRuleUpsertDto(int ParentTypeId, int ChildTypeId, bool IsRequired, int? MaxChildren);

    [HttpGet("org/hierarchy")]
    public async Task<ActionResult<IEnumerable<HierRuleDto>>> GetHierarchy(CancellationToken ct)
        => Ok(await _adminService.GetHierarchyRulesAsync(ct));

    [HttpPost("org/hierarchy")]
    public async Task<IActionResult> CreateHierarchy([FromBody] HierRuleUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateHierarchyRuleAsync(dto, ct);
        return CreatedAtAction(nameof(GetHierarchy), new { id }, new { id });
    }

    [HttpPut("org/hierarchy/{id:int}")]
    public async Task<IActionResult> UpdateHierarchy([FromRoute] int id, [FromBody] HierRuleUpsertDto dto, CancellationToken ct)
    {
        await _adminService.UpdateHierarchyRuleAsync(id, dto, ct);
        return NoContent();
    }

    [HttpDelete("org/hierarchy/{id:int}")]
    public async Task<IActionResult> DeleteHierarchy([FromRoute] int id, CancellationToken ct)
    {
        await _adminService.DeleteHierarchyRuleAsync(id, ct);
        return NoContent();
    }

    // ======= 組織「網域」 APIs =======
    [HttpGet("org/domains")]
    public async Task<ActionResult<List<OrgDomainDto>>> GetOrgDomains([FromQuery] int? orgId, CancellationToken ct)
        => Ok(await _adminService.GetOrgDomainsAsync(orgId, ct));

    [HttpGet("org/domains/{id:int}")]
    public async Task<ActionResult<OrgDomainDto>> GetOrgDomain([FromRoute] int id, CancellationToken ct)
    {
        var domain = await _adminService.GetOrgDomainAsync(id, ct);
        return domain is null ? NotFound() : Ok(domain);
    }

    [HttpPost("org/domains")]
    public async Task<IActionResult> CreateOrgDomain([FromBody] OrgDomainUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateOrgDomainAsync(dto, ct);
        return CreatedAtAction(nameof(GetOrgDomain), new { id }, new { id });
    }

    [HttpPut("org/domains/{id:int}")]
    public async Task<IActionResult> UpdateOrgDomain([FromRoute] int id, [FromBody] OrgDomainUpsertDto dto, CancellationToken ct)
    {
        await _adminService.UpdateOrgDomainAsync(id, dto, ct);
        return NoContent();
    }

    [HttpDelete("org/domains/{id:int}")]
    public async Task<IActionResult> DeleteOrgDomain([FromRoute] int id, CancellationToken ct)
    {
        await _adminService.DeleteOrgDomainAsync(id, ct);
        return NoContent();
    }

    // ===== Fields =====
    [HttpGet("kpi/fields")]
    public async Task<ActionResult<IEnumerable<KpiFieldDto>>> GetFields(CancellationToken ct)
        => Ok(await _adminService.GetFieldsAsync(ct));

    [HttpPost("kpi/fields")]
    public async Task<IActionResult> CreateField([FromBody] KpiFieldUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateFieldAsync(dto, ct);
        return CreatedAtAction(nameof(GetFields), new { id }, new { id });
    }

    [HttpPut("kpi/fields/{id:int}")]
    public async Task<IActionResult> UpdateField(int id, [FromBody] KpiFieldUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateFieldAsync(id, dto, ct); return NoContent(); }

    [HttpDelete("kpi/fields/{id:int}")]
    public async Task<IActionResult> DeleteField(int id, CancellationToken ct)
    { await _adminService.DeleteFieldAsync(id, ct); return NoContent(); }

    // ===== Items (list) =====
    [HttpGet("kpi/items")]
    public async Task<ActionResult<PagedResult<KpiItemRowDto>>> SearchItems(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] int? fieldId = null, [FromQuery] int? category = null,
        [FromQuery] int? orgId = null, [FromQuery] string? q = null, CancellationToken ct = default)
        => Ok(await _adminService.SearchItemsAsync(page, pageSize, fieldId, category, orgId, q, ct));

    // ===== Item detail =====
    [HttpGet("kpi/items/{id:int}")]
    public async Task<ActionResult<KpiItemDetailDto>> GetItem(int id, CancellationToken ct)
        => Ok(await _adminService.GetItemAsync(id, ct));

    [HttpPost("kpi/items")]
    public async Task<IActionResult> CreateItem([FromBody] KpiItemUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateItemAsync(dto, ct);
        return CreatedAtAction(nameof(GetItem), new { id }, new { id });
    }

    [HttpPut("kpi/items/{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] KpiItemUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateItemAsync(id, dto, ct); return NoContent(); }

    [HttpDelete("kpi/items/{id:int}")]
    public async Task<IActionResult> DeleteItem(int id, CancellationToken ct)
    { await _adminService.DeleteItemAsync(id, ct); return NoContent(); }

    // ===== ItemName（版本）=====
    [HttpPost("kpi/items/{id:int}/names")]
    public async Task<IActionResult> AddItemName(int id, [FromBody] KpiItemNameUpsertDto dto, CancellationToken ct)
    { await _adminService.AddItemNameAsync(id, dto, User.Identity?.Name ?? "", ct); return NoContent(); }

    [HttpPut("kpi/items/{id:int}/names/{nameId:int}")]
    public async Task<IActionResult> UpdateItemName(int id, int nameId, [FromBody] KpiItemNameUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateItemNameAsync(id, nameId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/items/{id:int}/names/{nameId:int}")]
    public async Task<IActionResult> DeleteItemName(int id, int nameId, CancellationToken ct)
    { await _adminService.DeleteItemNameAsync(id, nameId, ct); return NoContent(); }

    // ===== DetailItem =====
    [HttpPost("kpi/items/{id:int}/details")]
    public async Task<IActionResult> AddDetailItem(int id, [FromBody] KpiDetailItemUpsertDto dto, CancellationToken ct)
    { var detailId = await _adminService.AddDetailItemAsync(id, dto, ct); return Created("", new { id = detailId }); }

    [HttpPut("kpi/details/{detailId:int}")]
    public async Task<IActionResult> UpdateDetailItem(int detailId, [FromBody] KpiDetailItemUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateDetailItemAsync(detailId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/details/{detailId:int}")]
    public async Task<IActionResult> DeleteDetailItem(int detailId, CancellationToken ct)
    { await _adminService.DeleteDetailItemAsync(detailId, ct); return NoContent(); }

    // ===== DetailItemName（版本）=====
    [HttpPost("kpi/details/{detailId:int}/names")]
    public async Task<IActionResult> AddDetailItemName(int detailId, [FromBody] KpiDetailItemNameUpsertDto dto, CancellationToken ct)
    { await _adminService.AddDetailItemNameAsync(detailId, dto, User.Identity?.Name ?? "", ct); return NoContent(); }

    [HttpPut("kpi/details/{detailId:int}/names/{nameId:int}")]
    public async Task<IActionResult> UpdateDetailItemName(int detailId, int nameId, [FromBody] KpiDetailItemNameUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateDetailItemNameAsync(detailId, nameId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/details/{detailId:int}/names/{nameId:int}")]
    public async Task<IActionResult> DeleteDetailItemName(int detailId, int nameId, CancellationToken ct)
    { await _adminService.DeleteDetailItemNameAsync(detailId, nameId, ct); return NoContent(); }

    // ===== DetailItemMappingGroup（政策修訂計畫，底下掛多筆改名/換單位對照）=====
    [HttpGet("kpi/detail-item-mapping-groups")]
    public async Task<ActionResult<IEnumerable<KpiDetailItemMappingGroupDto>>> GetDetailItemMappingGroups(CancellationToken ct)
        => Ok(await _adminService.GetDetailItemMappingGroupsAsync(ct));

    [HttpPost("kpi/detail-item-mapping-groups")]
    public async Task<IActionResult> CreateDetailItemMappingGroup([FromBody] KpiDetailItemMappingGroupUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateDetailItemMappingGroupAsync(dto, User.Identity?.Name ?? "", ct);
        return Created("", new { id });
    }

    [HttpPut("kpi/detail-item-mapping-groups/{groupId:int}")]
    public async Task<IActionResult> UpdateDetailItemMappingGroup(int groupId, [FromBody] KpiDetailItemMappingGroupUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateDetailItemMappingGroupAsync(groupId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/detail-item-mapping-groups/{groupId:int}")]
    public async Task<IActionResult> DeleteDetailItemMappingGroup(int groupId, CancellationToken ct)
    { await _adminService.DeleteDetailItemMappingGroupAsync(groupId, ct); return NoContent(); }

    [HttpPost("kpi/detail-item-mapping-groups/{groupId:int}/mappings")]
    public async Task<IActionResult> AddDetailItemMapping(int groupId, [FromBody] KpiDetailItemMappingUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.AddDetailItemMappingAsync(groupId, dto, ct);
        return Created("", new { id });
    }

    [HttpPut("kpi/detail-item-mappings/{id:int}")]
    public async Task<IActionResult> UpdateDetailItemMapping(int id, [FromBody] KpiDetailItemMappingUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateDetailItemMappingAsync(id, dto, ct); return NoContent(); }

    [HttpDelete("kpi/detail-item-mappings/{id:int}")]
    public async Task<IActionResult> DeleteDetailItemMapping(int id, CancellationToken ct)
    { await _adminService.DeleteDetailItemMappingAsync(id, ct); return NoContent(); }

    // ===== ReportPeriodSetting（填報期別鎖定，GET 給一般填報頁面讀，PUT 只有 Admin 頁面會呼叫）=====
    [HttpGet("kpi/report-period-setting")]
    public async Task<ActionResult<ReportPeriodSettingDto>> GetReportPeriodSetting(CancellationToken ct)
        => Ok(await _adminService.GetReportPeriodSettingAsync(ct));

    [HttpPut("kpi/report-period-setting")]
    public async Task<IActionResult> UpdateReportPeriodSetting([FromBody] ReportPeriodSettingUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateReportPeriodSettingAsync(dto, User.Identity?.Name ?? "", ct); return NoContent(); }

    // ===== KpiData（基線/目標）=====
    [HttpGet("kpi/details/{detailId:int}/data")]
    public async Task<ActionResult<IEnumerable<KpiDataDto>>> ListKpiData(int detailId, CancellationToken ct)
        => Ok(await _adminService.ListKpiDataAsync(detailId, ct));

    [HttpPost("kpi/details/{detailId:int}/data")]
    public async Task<IActionResult> AddKpiData(int detailId, [FromBody] KpiDataUpsertDto dto, CancellationToken ct)
    { var id = await _adminService.AddKpiDataAsync(detailId, dto, ct); return Created("", new { id }); }

    [HttpPut("kpi/data/{dataId:int}")]
    public async Task<IActionResult> UpdateKpiData(int dataId, [FromBody] KpiDataUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateKpiDataAsync(dataId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/data/{dataId:int}")]
    public async Task<IActionResult> DeleteKpiData(int dataId, CancellationToken ct)
    { await _adminService.DeleteKpiDataAsync(dataId, ct); return NoContent(); }

    // ===== KpiReport（含狀態流轉）=====
    [HttpGet("kpi/data/{dataId:int}/reports")]
    public async Task<ActionResult<IEnumerable<KpiReportDto>>> ListReports(int dataId, CancellationToken ct)
        => Ok(await _adminService.ListReportsAsync(dataId, ct));

    [HttpPost("kpi/data/{dataId:int}/reports")]
    public async Task<IActionResult> AddReport(int dataId, [FromBody] KpiReportUpsertDto dto, CancellationToken ct)
    { var id = await _adminService.AddReportAsync(dataId, dto, ct); return Created("", new { id }); }

    [HttpPut("kpi/reports/{reportId:int}")]
    public async Task<IActionResult> UpdateReport(int reportId, [FromBody] KpiReportUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateReportAsync(reportId, dto, ct); return NoContent(); }

    [HttpDelete("kpi/reports/{reportId:int}")]
    public async Task<IActionResult> DeleteReport(int reportId, CancellationToken ct)
    { await _adminService.DeleteReportAsync(reportId, ct); return NoContent(); }

    // 狀態流轉：submit/review/return/finalize
    [HttpPatch("kpi/reports/{reportId:int}/status")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> ChangeReportStatus(int reportId, [FromBody] ChangeStatusReq req, CancellationToken ct)
    { await _adminService.ChangeReportStatusAsync(reportId, req.NewStatus, ct); return NoContent(); }

    // 批量狀態流轉
    [HttpPost("kpi/reports/batch-status")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> BatchChangeReportStatus([FromBody] BatchStatusReq req, CancellationToken ct)
    { await _adminService.BatchChangeReportStatusAsync(req.Ids, req.NewStatus, ct); return NoContent(); }

    // 管理員強制退回已核准批次
    public record BatchRevokeFinalizedReq(int Year, string Period, int? OrganizationId);
    [HttpPost("kpi/reports/batch-revoke-finalized")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> BatchRevokeFinalized([FromBody] BatchRevokeFinalizedReq req, CancellationToken ct)
    {
        var count = await _adminService.BatchRevokeFinalizedAsync(req.Year, req.Period, req.OrganizationId, ct);
        return Ok(new { count });
    }
    
    // 期別搬移：預覽
    [HttpGet("kpi/reports/move-period/preview")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> MovePeriodPreview(
        [FromQuery] int sourceYear, [FromQuery] string sourcePeriod, CancellationToken ct)
    {
        var items = await _adminService.GetPeriodMovePreviewAsync(sourceYear, sourcePeriod, ct);
        return Ok(items);
    }

    // 期別搬移：執行
    public record MovePeriodReq(int SourceYear, string SourcePeriod, int TargetYear, string TargetPeriod, int[]? OrganizationIds);
    [HttpPost("kpi/reports/move-period")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> MovePeriod([FromBody] MovePeriodReq req, CancellationToken ct)
    {
        var count = await _adminService.MovePeriodAsync(
            req.SourceYear, req.SourcePeriod,
            req.TargetYear, req.TargetPeriod,
            req.OrganizationIds, ct);
        return Ok(new { count });
    }

    // ===== KpiData 週期校正 =====
    [HttpGet("kpi/data-list")]
    public async Task<IActionResult> SearchKpiDataForCycle(
        [FromQuery] int? orgId,
        [FromQuery] int? cycleId,
        [FromQuery] bool noCycleOnly = false,
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _adminService.SearchKpiDataForCycleAsync(orgId, cycleId, noCycleOnly, q, page, pageSize, ct);
        return Ok(new { success = true, data = result });
    }

    public record BatchReassignCycleReq(int[] KpiDataIds, int? NewCycleId);
    [HttpPatch("kpi/data/batch-reassign-cycle")]
    public async Task<IActionResult> BatchReassignCycle([FromBody] BatchReassignCycleReq req, CancellationToken ct)
    {
        if (req.KpiDataIds.Length == 0) return BadRequest(new { message = "請至少選擇一筆" });
        var count = await _adminService.BatchReassignCycleAsync(req.KpiDataIds, req.NewCycleId, ct);
        return Ok(new { count });
    }

    // 只回傳有 KpiData 的機構（供 Excel 下載頁篩選用）
    [HttpGet("kpi/orgs-with-data")]
    public async Task<IActionResult> GetOrgsWithData(CancellationToken ct)
    {
        var orgIds = await _db.KpiDatas
            .Where(d => d.OrganizationId.HasValue)
            .Select(d => d.OrganizationId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var orgs = await _db.Organizations
            .Where(o => orgIds.Contains(o.Id) && o.IsActive)
            .OrderBy(o => o.Name)
            .Select(o => new { o.Id, o.Name })
            .ToListAsync(ct);

        return Ok(orgs);
    }

    // ===== 歷史績效指標 Excel 匯出 =====
    [HttpGet("kpi/history-export")]
    public async Task<IActionResult> ExportKpiHistory(
        [FromQuery] int[] orgIds,
        CancellationToken ct)
    {
        if (orgIds.Length == 0)
            return BadRequest(new { message = "請至少選擇一個機構" });

        var bytes = await _adminService.ExportKpiHistoryToExcelAsync(orgIds, ct);
        var fileName = $"KPI歷史績效_{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    // ===== KpiCycles =====
    [HttpGet("kpi/cycles")]
    public async Task<ActionResult<IEnumerable<KpiCycleDto>>> ListCycles(CancellationToken ct)
        => Ok(await _adminService.ListCyclesAsync(ct));

    [HttpPost("kpi/cycles")]
    public async Task<IActionResult> CreateCycle([FromBody] KpiCycleUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateCycleAsync(dto, ct);
        return Created("", new { id });
    }

    [HttpPut("kpi/cycles/{id:int}")]
    public async Task<IActionResult> UpdateCycle(int id, [FromBody] KpiCycleUpsertDto dto, CancellationToken ct)
    {
        await _adminService.UpdateCycleAsync(id, dto, ct);
        return NoContent();
    }

    [HttpDelete("kpi/cycles/{id:int}")]
    public async Task<IActionResult> DeleteCycle(int id, CancellationToken ct)
    {
        await _adminService.DeleteCycleAsync(id, ct);
        return NoContent();
    }
    
    
    // ===== 下拉 =====
    [HttpGet("suggest/event-types")]
    public async Task<ActionResult<IEnumerable<SuggestEventTypeDto>>> ListEventTypes(CancellationToken ct)
        => Ok(await _adminService.ListEventTypesAsync(ct));

    [HttpGet("suggest/suggestion-types")]
    public async Task<ActionResult<IEnumerable<SuggestionTypeDto>>> ListSuggestionTypes(CancellationToken ct)
        => Ok(await _adminService.ListSuggestionTypesAsync(ct));

    [HttpGet("suggest/is-adopted-options")]
    public async Task<ActionResult<IEnumerable<IsAdoptedOption>>> ListIsAdoptedOptions()
        => Ok(await _adminService.ListIsAdoptedOptionsAsync());

    // ===== SuggestDate（督導主檔）=====
    [HttpGet("suggest/dates")]
    public async Task<ActionResult<PagedResult<SuggestDateRowDto>>> SearchDates(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? orgId = null,
        [FromQuery] int? eventTypeId = null,
        [FromQuery] int? year = null,
        CancellationToken ct = default)
        => Ok(await _adminService.SearchSuggestDatesAsync(page, pageSize, orgId, eventTypeId, year, ct));

    [HttpGet("suggest/dates/{id:int}")]
    public async Task<ActionResult<SuggestDateDetailDto>> GetDate(int id, CancellationToken ct)
        => Ok(await _adminService.GetSuggestDateAsync(id, ct));

    [HttpPost("suggest/dates")]
    public async Task<IActionResult> CreateDate([FromBody] SuggestDateUpsertDto dto, CancellationToken ct)
    {
        var id = await _adminService.CreateSuggestDateAsync(dto, ct);
        return CreatedAtAction(nameof(GetDate), new { id }, new { id });
    }

    [HttpPut("suggest/dates/{id:int}")]
    public async Task<IActionResult> UpdateDate(int id, [FromBody] SuggestDateUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateSuggestDateAsync(id, dto, ct); return NoContent(); }

    [HttpDelete("suggest/dates/{id:int}")]
    public async Task<IActionResult> DeleteDate(int id, CancellationToken ct)
    { await _adminService.DeleteSuggestDateAsync(id, ct); return NoContent(); }

    // ===== SuggestReport（建議報告）=====
    [HttpGet("suggest/dates/{dateId:int}/reports")]
    public async Task<ActionResult<IEnumerable<SuggestReportRowDto>>> ListReportsByDate(int dateId, CancellationToken ct)
        => Ok(await _adminService.ListReportsByDateAsync(dateId, ct));

    [HttpGet("suggest/reports/{id:int}")]
    public async Task<ActionResult<SuggestReportRowDto>> GetReport(int id, CancellationToken ct)
        => Ok(await _adminService.GetReportAsync(id, ct));

    [HttpPost("suggest/dates/{dateId:int}/reports")]
    public async Task<IActionResult> CreateReport(int dateId, [FromBody] SuggestReportUpsertDto dto, CancellationToken ct)
    {
        var userId = GetUserIdOrThrow();
        var id = await _adminService.CreateReportAsync(dateId, dto, userId, ct);
        return CreatedAtAction(nameof(GetReport), new { id }, new { id });
    }

    [HttpPut("suggest/reports/{id:int}")]
    public async Task<IActionResult> UpdateReport(int id, [FromBody] SuggestReportUpsertDto dto, CancellationToken ct)
    { await _adminService.UpdateReportAsync(id, dto, ct); return NoContent(); }

    // 跨日期搜尋（儀表板/統計）
    [HttpGet("suggest/reports/search")]
    public async Task<ActionResult<PagedResult<SuggestReportRowDto>>> SearchReports(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? orgId = null,
        [FromQuery] int? suggestionTypeId = null,
        [FromQuery] int? kpiFieldId = null,
        [FromQuery] int? year = null,
        [FromQuery] string? q = null,
        CancellationToken ct = default)
        => Ok(await _adminService.SearchReportsAsync(page, pageSize, orgId, suggestionTypeId, kpiFieldId, year, q, ct));

    // ===== 填報統計總覽 =====

    [HttpGet("statistics/submission-status")]
    public async Task<IActionResult> GetSubmissionStatus(
        [FromQuery] int year,
        [FromQuery] string? period,
        CancellationToken ct)
    {
        // KPI 已填報（Status >= Submitted=1）按公司彙總
        var kpiQuery = _db.KpiReports
            .Where(r => r.Year == year && r.Status >= ReportStatus.Submitted);
        if (!string.IsNullOrEmpty(period))
            kpiQuery = kpiQuery.Where(r => r.Period == period);

        var kpiByOrg = await kpiQuery
            .Join(_db.KpiDatas, r => r.KpiDataId, d => d.Id,
                  (r, d) => new { r.Status, d.OrganizationId })
            .Where(x => x.OrganizationId.HasValue)
            .GroupBy(x => x.OrganizationId!.Value)
            .Select(g => new {
                OrgId = g.Key,
                Submitted = g.Count(),
                Finalized = g.Count(x => x.Status == ReportStatus.Finalized)
            })
            .ToDictionaryAsync(x => x.OrgId, ct);

        // 委員建議：取每家公司最新一筆事件，判斷最終狀態是否為 Submitted
        // (SuggestSubmissions 為 append-only，每次送出/退回都新增一筆)
        var allSubEvents = await _db.SuggestSubmissions
            .Where(s => s.Year == year && (string.IsNullOrEmpty(period) || s.Period == period))
            .ToListAsync(ct);

        var suggestByOrg = allSubEvents
            .GroupBy(s => s.OrganizationId)
            .Where(g => g.OrderByDescending(x => x.SubmittedAt).First().Status == SuggestSubmissionStatus.Submitted)
            .ToDictionary(g => g.Key, g => new { Count = 1 });

        // 改善報告書已上傳，按公司彙總
        var improvByOrg = await _db.SuggestFiles
            .Where(f => f.Year == year)
            .GroupBy(f => f.OrganizationId)
            .Select(g => new { OrgId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OrgId, ct);

        // 有分配 KpiData 的公司清單
        var orgIds = await _db.KpiDatas
            .Where(d => d.OrganizationId.HasValue)
            .Select(d => d.OrganizationId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var orgs = await _db.Organizations
            .Where(o => orgIds.Contains(o.Id))
            .OrderBy(o => o.Name)
            .Select(o => new { o.Id, o.Name })
            .ToListAsync(ct);

        var result = orgs.Select(o => {
            kpiByOrg.TryGetValue(o.Id, out var k);
            suggestByOrg.TryGetValue(o.Id, out var s);
            improvByOrg.TryGetValue(o.Id, out var im);
            return new {
                orgId        = o.Id,
                orgName      = o.Name,
                kpiSubmitted = k?.Submitted ?? 0,
                kpiFinalized = k?.Finalized ?? 0,
                suggestUpdated       = s?.Count ?? 0,
                improvementUploaded  = im?.Count ?? 0,
            };
        }).ToList();

        return Ok(result);
    }

    // ===== 填報催繳提醒信 =====

    public record ReminderCandidateDto(
        Guid Id,
        string Name,
        string Email,
        string[] Roles,
        string? OrganizationName,
        string Group
    );

    [HttpGet("organizations/{orgId}/reminder-candidates")]
    public async Task<IActionResult> GetReminderCandidates(int orgId, CancellationToken ct)
    {
        // 建立所有組織的 id→(parentId, name) 對應表，在記憶體中往上追祖先鏈
        var orgIndex = await _db.Organizations
            .AsNoTracking()
            .Select(o => new { o.Id, o.ParentId, o.Name })
            .ToDictionaryAsync(o => o.Id, ct);

        var ancestorIds = new List<int>();
        int? cur = orgId;
        while (cur.HasValue && orgIndex.ContainsKey(cur.Value))
        {
            ancestorIds.Add(cur.Value);
            cur = orgIndex[cur.Value].ParentId;
        }

        // 廠商人員：目標廠及所有上層公司的使用者（含 email、啟用中）
        var rawOrgUsers = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Where(u =>
                ancestorIds.Contains(u.OrganizationId) &&
                u.IsActive &&
                !string.IsNullOrEmpty(u.Email))
            .Select(u => new {
                u.Id,
                Name = string.IsNullOrWhiteSpace(u.Nickname) ? u.Username : u.Nickname,
                u.Email,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToArray(),
                u.OrganizationId
            })
            .ToListAsync(ct);

        var orgUsers = rawOrgUsers
            .Select(u => new ReminderCandidateDto(
                u.Id,
                u.Name,
                u.Email!,
                u.Roles,
                orgIndex.TryGetValue(u.OrganizationId, out var org) ? org.Name : null,
                "company"
            ))
            .ToList();

        // 管理人員：有 admin 角色、不在祖先鏈中的使用者
        var adminUsers = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Organization)
            .Where(u =>
                u.IsActive &&
                !string.IsNullOrEmpty(u.Email) &&
                !ancestorIds.Contains(u.OrganizationId) &&
                u.UserRoles.Any(ur => ur.Role.Name.ToLower().Contains("admin")))
            .Select(u => new ReminderCandidateDto(
                u.Id,
                string.IsNullOrWhiteSpace(u.Nickname) ? u.Username : u.Nickname,
                u.Email!,
                u.UserRoles.Select(ur => ur.Role.Name).ToArray(),
                u.Organization != null ? u.Organization.Name : null,
                "admin"
            ))
            .ToListAsync(ct);

        return Ok(new { orgUsers, adminUsers });
    }

    public record SendReminderEmailsRequest(
        int OrgId,
        string OrgName,
        int Year,
        string Period,
        List<Guid> UserIds
    );

    [HttpPost("send-reminder-emails")]
    public async Task<IActionResult> SendReminderEmails(
        [FromBody] SendReminderEmailsRequest req,
        CancellationToken ct)
    {
        if (req.UserIds == null || req.UserIds.Count == 0)
            return BadRequest(new { message = "請至少選擇一位收件人" });

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => req.UserIds.Contains(u.Id) && !string.IsNullOrEmpty(u.Email))
            .Select(u => new {
                u.Id,
                u.Email,
                Name = string.IsNullOrWhiteSpace(u.Nickname) ? u.Username : u.Nickname
            })
            .ToListAsync(ct);

        var sent = 0;
        var errors = new List<string>();

        foreach (var user in users)
        {
            try
            {
                await _emailService.SendReminderEmailAsync(
                    user.Email!, user.Name, req.OrgName, req.Year, req.Period);
                sent++;
            }
            catch (Exception ex)
            {
                errors.Add($"{user.Name}（{user.Email}）：{ex.Message}");
            }
        }

        return Ok(new { sent, errors });
    }

    private Guid GetUserIdOrThrow()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            throw new InvalidOperationException("無法解析使用者識別");
        return userId;
    }

    // ======= KPI 審核 =======

    [HttpGet("kpi/reports")]
    [Authorize(Policy = "Permission:kpi-approve")]
    public async Task<IActionResult> GetKpiReports(
        [FromQuery] byte? status,
        [FromQuery] int? organizationId,
        [FromQuery] string? orgName,
        [FromQuery] string? field,
        [FromQuery] int? year,
        [FromQuery] string? period,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _adminService.GetKpiReportsForReviewAsync(status, organizationId, orgName, field, year, period, page, pageSize, ct);
        return Ok(new { success = true, data = result });
    }

    public record ChangeStatusReq(byte NewStatus);
    public record BatchStatusReq(List<int> Ids, byte NewStatus);

    // ======= 系統公告 =======

    /// <summary>取得系統公告（所有登入使用者可存取）</summary>
    [HttpGet("announcement")]
    public async Task<IActionResult> GetAnnouncement(CancellationToken ct)
    {
        var item = await _db.SystemAnnouncements.FirstOrDefaultAsync(ct);
        if (item == null)
            return Ok(new { isEnabled = false, message = "", severity = "warning" });
        return Ok(new { isEnabled = item.IsEnabled, message = item.Message, severity = item.Severity });
    }

    /// <summary>更新系統公告（Admin）</summary>
    [HttpPut("announcement")]
    public async Task<IActionResult> UpdateAnnouncement([FromBody] AnnouncementRequest req, CancellationToken ct)
    {
        // 只有具備 manage-users 權限的 Admin 可以更新公告
        var hasPermission = User.Claims
            .Any(c => c.Type == "permission" && c.Value == "manage-users");
        if (!hasPermission) return Forbid();

        var item = await _db.SystemAnnouncements.FirstOrDefaultAsync(ct);
        if (item == null)
        {
            item = new SystemAnnouncement();
            _db.SystemAnnouncements.Add(item);
        }
        item.IsEnabled = req.IsEnabled;
        item.Message = req.Message ?? "";
        item.Severity = req.Severity ?? "warning";
        item.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    public record AnnouncementRequest(bool IsEnabled, string? Message, string? Severity);
}