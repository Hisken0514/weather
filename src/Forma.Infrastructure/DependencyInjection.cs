using Fido2NetLib;
using Forma.Application.Common.Interfaces;
using Forma.Domain.Interfaces;
using Forma.Infrastructure.Auth;
using Forma.Infrastructure.Data.Context;
using Forma.Infrastructure.Data.Repositories;
using Forma.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Forma.Infrastructure;

/// <summary>
/// Infrastructure 層依賴注入配置
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// 註冊 Infrastructure 層服務
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext
        services.AddDbContext<FormaDbContext>(options =>
        {
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(FormaDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null);
                    npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                });
        });

        // Repositories
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Redis Cache
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = "Forma:";
            });
        }
        else
        {
            // 使用記憶體快取作為備用
            services.AddDistributedMemoryCache();
        }

        // Authentication Services
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.AddSingleton<IJwtSettings>(sp =>
            sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<JwtSettings>>().Value);
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<FormaDbContext>());
        services.AddHttpContextAccessor();

        // Supervision Import
        services.AddScoped<IExcelImportService, ExcelImportService>();

        // 全台工廠風險排名：歷史資料匯入
        services.AddScoped<IFactoryRiskImportService, FactoryRiskImportService>();

        // FIDO2
        services.AddSingleton<IFido2>(sp =>
        {
            return new Fido2(new Fido2Configuration
            {
                ServerDomain = configuration["Fido2:ServerDomain"] ?? "localhost",
                ServerName = configuration["Fido2:ServerName"] ?? "Forma",
                Origins = configuration.GetSection("Fido2:Origins").Get<HashSet<string>>()
                           ?? new HashSet<string> { "https://localhost:5173" }
            });
        });

        return services;
    }
}
