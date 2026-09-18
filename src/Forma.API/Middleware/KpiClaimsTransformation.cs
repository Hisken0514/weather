using System.Security.Claims;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Authentication;

namespace Forma.API.Middleware;

/// <summary>
/// KPI → Forma claims 轉換。
///
/// KPI token 的授權使用多個字串 claims（"permission": "view", "edit", ...），
/// 而 Forma 的授權策略依賴單一數值 claim（"permissions": long）。
///
/// 此轉換在驗證後自動執行，讓 KPI 使用者可存取 Forma 的受保護端點，
/// 無需重新登入。
/// </summary>
public class KpiClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        // 已有 Forma 原生 permissions claim → Forma token，不需轉換
        if (principal.HasClaim(c => c.Type == "permissions"))
            return Task.FromResult(principal);

        // 取出所有 KPI permission claims（一個 token 可能有多個）
        var kpiPermissions = principal
            .FindAll("permission")
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (kpiPermissions.Count == 0)
            return Task.FromResult(principal);

        // 映射至 Forma UserPermission bit mask
        var formaPermissions = MapKpiToFormaPermissions(kpiPermissions);

        // Clone 後加入 permissions claim（不修改原始 principal）
        var clone = principal.Clone();
        var identity = (ClaimsIdentity)clone.Identity!;
        identity.AddClaim(new Claim("permissions", formaPermissions.ToString()));

        return Task.FromResult(clone);
    }

    /// <summary>
    /// KPI 權限字串 → Forma UserPermission 映射規則
    ///
    /// KPI 管理員識別：擁有 "delete" permission（roleId=1，TypeId=1/5/6）
    ///   admin  → Forma 最高權限（UserPermission.All）
    ///   其他   → Forma 最低權限（ViewReports）
    /// </summary>
    private static long MapKpiToFormaPermissions(HashSet<string> kpiPermissions)
    {
        // KPI admin：具有 "delete" 權限
        if (kpiPermissions.Contains("delete"))
            return (long)UserPermission.All;

        // 其他 KPI 使用者（edit / view / view-report / view-ranking）→ 最低權限
        return (long)UserPermission.ViewReports;
    }
}
