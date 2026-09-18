using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Forma.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#pragma warning disable CA1848 // Use LoggerMessage

namespace Forma.Infrastructure.Data;

/// <summary>
/// 資料庫種子資料服務
/// </summary>
public static class DataSeeder
{
    /// <summary>
    /// 初始化種子資料
    /// </summary>
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FormaDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<FormaDbContext>>();

        try
        {
            // 確保資料庫已建立
            await context.Database.MigrateAsync();

            // 種子預設組織
            await SeedOrganizationsAsync(context, logger);

            // 種子系統管理員角色
            await SeedRolesAsync(context, logger);

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "種子資料初始化失敗");
            throw;
        }
    }

    private static async Task SeedOrganizationsAsync(FormaDbContext context, ILogger logger)
    {
        if (await context.Organizations.AnyAsync())
        {
            return;
        }

        logger.LogInformation("建立預設組織...");

        var defaultOrg = new Organization
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Name = "預設組織",
            Code = "DEFAULT",
            Description = "系統預設組織，供一般使用者建立計畫",
            Type = OrganizationType.Central,
            CreatedAt = DateTime.UtcNow
        };

        context.Organizations.Add(defaultOrg);
        logger.LogInformation("預設組織已建立: {Name} ({Code})", defaultOrg.Name, defaultOrg.Code);
    }

    private static async Task SeedRolesAsync(FormaDbContext context, ILogger logger)
    {
        var adminRole = await context.Roles
            .FirstOrDefaultAsync(r => r.Name == "系統管理員");

        if (adminRole != null)
        {
            // 確保既有角色擁有全部權限
            if (adminRole.PermissionValue != (long)UserPermission.All)
            {
                adminRole.PermissionValue = (long)UserPermission.All;
                logger.LogInformation("已更新系統管理員角色權限");
            }
            return;
        }

        logger.LogInformation("建立系統管理員角色...");

        adminRole = new Role
        {
            Name = "系統管理員",
            Description = "擁有所有系統權限",
            PermissionValue = (long)UserPermission.All,
            CreatedAt = DateTime.UtcNow
        };

        context.Roles.Add(adminRole);
        logger.LogInformation("系統管理員角色已建立");
    }
}
