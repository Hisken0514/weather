namespace WebAPI1.DTOs;

public record McpClientRegistrationRequest(string ClientName, List<string> RedirectUris);

public record McpClientRegistrationResponse(
    string client_id,
    string client_name,
    List<string> redirect_uris,
    string token_endpoint_auth_method = "none");

public record PendingMcpAuthorizationDto(string RequestId, string ClientId, string ClientName, string? Scope);

public record McpAuthorizationDecisionRequest(string RequestId, bool Approve);

public record McpTokenResponse(
    string access_token,
    string token_type,
    int expires_in,
    string? refresh_token,
    string? scope);

public record McpOAuthClientAdminDto(
    string ClientId,
    string ClientName,
    List<string> RedirectUris,
    DateTime CreatedAt,
    int ActiveRefreshTokenCount);

/// <summary>McpAuthorizationServerService 內部用，authorize 那個請求本身的暫存狀態（存 Redis）。</summary>
public record PendingAuthorizationState(
    string ClientId,
    string ClientName,
    string RedirectUri,
    string CodeChallenge,
    string? State,
    string? Scope,
    string UserId);
