using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebAPI1.Common;
using WebAPI1.DTOs;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

/// <summary>
/// KPI 對外開放 /mcp 端點的 OAuth 2.1 Authorization Server RFC 端點（discovery/DCR/authorize/
/// token），照搬自 ISHAAudit 那套已經在跑的實作。這些路徑規範要求開在網站根目錄，不能掛 /api
/// 前綴——KPI.Web 的 next.config.js 已經先把 /oauth/* 跟 /.well-known/* rewrite 到這個後端了。
/// </summary>
[ApiController]
[EnableCors("McpPublic")]
public class McpOAuthController : ControllerBase
{
    private readonly IMcpAuthorizationServerService _service;
    private readonly IConfiguration _configuration;

    public McpOAuthController(IMcpAuthorizationServerService service, IConfiguration configuration)
    {
        _service = service;
        _configuration = configuration;
    }

    private string ResolveIssuer()
    {
        var configured = _configuration["PublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.TrimEnd('/');
        }
        var request = HttpContext.Request;
        return $"{request.Scheme}://{request.Host}".TrimEnd('/');
    }

    [HttpGet(".well-known/oauth-authorization-server")]
    public IActionResult AuthorizationServerMetadata()
    {
        var issuer = ResolveIssuer();
        return Ok(new
        {
            issuer,
            authorization_endpoint = $"{issuer}/oauth/authorize",
            token_endpoint = $"{issuer}/oauth/token",
            registration_endpoint = $"{issuer}/oauth/register",
            response_types_supported = new[] { "code" },
            grant_types_supported = new[] { "authorization_code", "refresh_token" },
            code_challenge_methods_supported = new[] { "S256" },
            token_endpoint_auth_methods_supported = new[] { "none" },
        });
    }

    [HttpGet(".well-known/oauth-protected-resource")]
    public IActionResult ProtectedResourceMetadata()
    {
        var issuer = ResolveIssuer();
        // /mcp 本身掛在後端根目錄，但外部客戶端要打的是 KPI.Web 的 /api/:path* rewrite 轉進來的
        // 路徑（見 next.config.js），也就是 {issuer}/api/mcp，不是 {issuer}/mcp。
        return Ok(new
        {
            resource = $"{issuer}/api/mcp",
            authorization_servers = new[] { issuer },
        });
    }

    [HttpPost("oauth/register")]
    public async Task<IActionResult> Register([FromBody] McpClientRegistrationRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _service.RegisterClientAsync(request, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = "invalid_client_metadata", error_description = ex.Message });
        }
    }

    /// <summary>外部 MCP client 把使用者瀏覽器導來這裡開始授權流程。這裡打的是使用者的一般
    /// 登入 session（cookie/一般登入 JWT），不是 /mcp 用的那組 Mcp scheme。</summary>
    [HttpGet("oauth/authorize")]
    public async Task<IActionResult> Authorize(
        [FromQuery] string client_id, [FromQuery] string redirect_uri, [FromQuery] string code_challenge,
        [FromQuery] string? code_challenge_method, [FromQuery] string? state, [FromQuery] string? scope,
        CancellationToken ct)
    {
        if (code_challenge_method is not null && code_challenge_method != "S256")
        {
            return BadRequest(new { error = "invalid_request", error_description = "只支援 code_challenge_method=S256" });
        }

        var authResult = await HttpContext.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            // returnUrl 這裡故意不帶 /iskpi 前綴——前端 getPostLoginRedirect() 收到後會直接拿去
            // 給 Next.js router 導頁，router 自己會補 basePath，這裡先加了反而會變成 /iskpi/iskpi/...。
            var returnUrl = Uri.EscapeDataString(HttpContext.Request.GetEncodedPathAndQuery());
            return Redirect($"/iskpi/login?returnUrl={returnUrl}");
        }

        var userId = authResult.Principal.FindFirst("sub")?.Value
            ?? authResult.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId is null)
        {
            return Unauthorized();
        }

        var allowedUserId = await _service.ResolveCallerUserIdAsync(userId, ct);
        if (allowedUserId is null)
        {
            return StatusCode(403, new { error = "access_denied", error_description = "這個帳號沒有使用 AI Agent 對外連接的權限" });
        }

        try
        {
            var requestId = await _service.CreatePendingAuthorizationAsync(
                client_id, redirect_uri, code_challenge, state, scope, userId, ct);
            // KPI.Web 固定掛在 /iskpi 這個 basePath 下（next.config.js），跟其他既有的
            // 對外網址（FrontendUrl 等）一樣直接寫死，不另外抽一層設定。
            return Redirect($"/iskpi/oauth/consent?request={requestId}");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "invalid_request", error_description = ex.Message });
        }
    }

    [HttpGet("oauth/authorize/pending")]
    [Authorize]
    public async Task<IActionResult> GetPending([FromQuery] string request, CancellationToken ct)
    {
        var pending = await _service.GetPendingAuthorizationAsync(request, ct);
        if (pending is null)
        {
            return NotFound(new { error = "not_found", error_description = "這個授權請求不存在或已過期，請從 MCP client 重新開始連接流程。" });
        }
        return Ok(pending);
    }

    [HttpPost("oauth/authorize/decision")]
    [Authorize]
    public async Task<IActionResult> Decide([FromBody] McpAuthorizationDecisionRequest request, CancellationToken ct)
    {
        try
        {
            var redirectTo = await _service.DecideAuthorizationAsync(request.RequestId, request.Approve, ct);
            return Ok(redirectTo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "invalid_request", error_description = ex.Message });
        }
    }

    [HttpPost("oauth/token")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Token([FromForm] string grant_type, [FromForm] string? code,
        [FromForm] string? redirect_uri, [FromForm] string? client_id, [FromForm] string? code_verifier,
        [FromForm] string? refresh_token, CancellationToken ct)
    {
        try
        {
            McpTokenResponse token;
            switch (grant_type)
            {
                case "authorization_code":
                    if (code is null || redirect_uri is null || client_id is null || code_verifier is null)
                    {
                        return BadRequest(new { error = "invalid_request" });
                    }
                    token = await _service.ExchangeAuthorizationCodeAsync(code, redirect_uri, client_id, code_verifier, ct);
                    break;
                case "refresh_token":
                    if (refresh_token is null || client_id is null)
                    {
                        return BadRequest(new { error = "invalid_request" });
                    }
                    token = await _service.ExchangeRefreshTokenAsync(refresh_token, client_id, ct);
                    break;
                default:
                    return BadRequest(new { error = "unsupported_grant_type" });
            }
            return Ok(token);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "invalid_grant", error_description = ex.Message });
        }
    }

    [HttpGet("oauth/clients")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> ListClients(CancellationToken ct)
        => Ok(await _service.ListClientsAsync(ct));

    [HttpDelete("oauth/clients/{clientId}")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> RevokeClient(string clientId, CancellationToken ct)
    {
        await _service.RevokeClientAsync(clientId, ct);
        return NoContent();
    }
}
