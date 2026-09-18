using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Application.Services;

namespace Forma.API.Middleware;

/// <summary>
/// Security Headers 中間件
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ISystemSettingService settingService)
    {
        SecurityHeadersSettingsDto settings;
        try
        {
            settings = await settingService.GetSettingAsync<SecurityHeadersSettingsDto>("SecurityHeaders");
        }
        catch
        {
            settings = new SecurityHeadersSettingsDto();
        }

        var headers = context.Response.Headers;

        // X-XSS-Protection
        if (settings.EnableXssProtection)
        {
            headers["X-XSS-Protection"] = "1; mode=block";
        }

        // X-Content-Type-Options
        if (settings.EnableNoSniff)
        {
            headers["X-Content-Type-Options"] = "nosniff";
        }

        // X-Frame-Options
        if (!string.IsNullOrEmpty(settings.XFrameOptions))
        {
            headers["X-Frame-Options"] = settings.XFrameOptions;
        }

        // HSTS
        if (settings.EnableHsts && context.Request.IsHttps)
        {
            var hstsValue = $"max-age={settings.HstsMaxAgeSeconds}";
            if (settings.HstsIncludeSubDomains)
            {
                hstsValue += "; includeSubDomains";
            }
            headers["Strict-Transport-Security"] = hstsValue;
        }

        // Referrer-Policy
        if (!string.IsNullOrEmpty(settings.ReferrerPolicy))
        {
            headers["Referrer-Policy"] = settings.ReferrerPolicy;
        }

        // CSP
        if (settings.EnableCsp)
        {
            var cspParts = new List<string>();

            if (!string.IsNullOrEmpty(settings.CspDefaultSrc))
                cspParts.Add($"default-src {settings.CspDefaultSrc}");
            if (!string.IsNullOrEmpty(settings.CspScriptSrc))
                cspParts.Add($"script-src {settings.CspScriptSrc}");
            if (!string.IsNullOrEmpty(settings.CspStyleSrc))
                cspParts.Add($"style-src {settings.CspStyleSrc}");
            if (!string.IsNullOrEmpty(settings.CspImgSrc))
                cspParts.Add($"img-src {settings.CspImgSrc}");
            if (!string.IsNullOrEmpty(settings.CspFontSrc))
                cspParts.Add($"font-src {settings.CspFontSrc}");
            if (!string.IsNullOrEmpty(settings.CspConnectSrc))
                cspParts.Add($"connect-src {settings.CspConnectSrc}");
            if (!string.IsNullOrEmpty(settings.CspFrameSrc))
                cspParts.Add($"frame-src {settings.CspFrameSrc}");
            if (!string.IsNullOrEmpty(settings.CspFrameAncestors))
                cspParts.Add($"frame-ancestors {settings.CspFrameAncestors}");

            var cspValue = string.Join("; ", cspParts);
            var headerName = settings.CspReportOnly
                ? "Content-Security-Policy-Report-Only"
                : "Content-Security-Policy";
            headers[headerName] = cspValue;
        }

        await _next(context);
    }
}
