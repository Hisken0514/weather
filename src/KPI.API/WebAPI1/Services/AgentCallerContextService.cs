using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;

namespace WebAPI1.Services;

/// <summary>
/// 呼叫者的 org/角色資訊，AgentController 專用。刻意不擴充共用的 ICurrentUserService
/// （那個介面被其他既有功能共用，改動它風險面太大），改成獨立小服務查 DB 解析。
/// </summary>
public record AgentCallerContext(
    Guid UserId,
    int? OrganizationId,
    string[] RoleNames,
    int[] RoleIds,
    bool IsSuperAdmin);

public interface IAgentCallerContextService
{
    Task<AgentCallerContext?> GetAsync(ClaimsPrincipal user);

    /// <summary>回傳呼叫者能查詢的文件 org 範圍：SuperAdmin 回 null（代表不過濾，查全部）；
    /// 一般角色回自己 org 往下的所有廠商 org id（含自己）。</summary>
    Task<List<int>?> GetAccessibleOrganizationIdsAsync(AgentCallerContext caller);
}

public class AgentCallerContextService : IAgentCallerContextService
{
    private readonly ISHAuditDbcontext _db;
    private readonly IOrganizationService _organizationService;

    // 跟 AuthService 判斷「company/廠商層級」一致：TypeId 2/3/4 是廠商，其餘視為政府/管理端。
    private static readonly int[] CompanyOrgTypeIds = { 2, 3, 4 };

    public AgentCallerContextService(ISHAuditDbcontext db, IOrganizationService organizationService)
    {
        _db = db;
        _organizationService = organizationService;
    }

    public async Task<AgentCallerContext?> GetAsync(ClaimsPrincipal user)
    {
        var userIdRaw = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return null;
        }

        var dbUser = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (dbUser is null)
        {
            return null;
        }

        var roleNames = dbUser.UserRoles.Select(ur => ur.Role.Name).ToArray();
        var roleIds = dbUser.UserRoles.Select(ur => ur.RoleId).ToArray();

        // "delete" permission 在既有前端慣例裡就是拿來當 super-admin 判斷用（見 Dashboard.tsx
        // 的 isSuperAdmin 推導），這裡沿用同一個判斷基準，不另外發明一套。
        var isSuperAdmin = user.FindAll("permission").Any(c => c.Value == "delete");

        return new AgentCallerContext(dbUser.Id, dbUser.OrganizationId, roleNames, roleIds, isSuperAdmin);
    }

    public async Task<List<int>?> GetAccessibleOrganizationIdsAsync(AgentCallerContext caller)
    {
        if (caller.IsSuperAdmin)
        {
            return null;
        }

        if (caller.OrganizationId is null)
        {
            return new List<int>();
        }

        return _organizationService.GetDescendantOrganizationIds(caller.OrganizationId.Value);
    }
}
