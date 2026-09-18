using System.Text;
using Forma.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace Forma.API.Extensions;

/// <summary>
/// JWT 認證配置擴充方法
/// </summary>
public static class AuthenticationExtensions
{
    /// <summary>
    /// 新增 JWT 認證服務
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
            ?? throw new InvalidOperationException("JwtSettings is not configured");

        // SSO：同時接受與 KPI 系統相同的 Issuer/Audience
        // 在 docker-compose 中透過環境變數 JwtSettings__SecretKey / JwtSettings__Issuer /
        // JwtSettings__Audience 將兩個系統設定為相同值
        var key = Encoding.UTF8.GetBytes(jwtSettings.SecretKey);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false; // 開發環境可設為 false
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (string.IsNullOrEmpty(context.Token))
                    {
                        // Forma 原生 cookie
                        context.Token = context.Request.Cookies["forma_access_token"];
                    }
                    if (string.IsNullOrEmpty(context.Token))
                    {
                        // KPI SSO cookie（與 KPI.Web 同網域時共享）
                        var kpiCookieName = configuration.GetValue<string>("SsoSettings:KpiCookieName") ?? "token";
                        context.Token = context.Request.Cookies[kpiCookieName];
                    }
                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                    {
                        context.Response.Headers.Append("Token-Expired", "true");
                    }
                    return Task.CompletedTask;
                }
            };
        });

        return services;
    }

    /// <summary>
    /// 配置 Swagger 以支援 JWT 認證
    /// </summary>
    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Forma API",
                Version = "v1",
                Description = "Forma - 動態表單管理系統 API"
            });

            // 新增 JWT Bearer 認證
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "請輸入 JWT Token，格式：Bearer {token}"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }
}
