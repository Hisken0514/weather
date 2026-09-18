using Fido2NetLib;
using Forma.Application.Features.Auth.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// FIDO2 / Passkey 服務介面
/// </summary>
public interface IFido2Service
{
    /// <summary>
    /// 開始註冊（取得 CredentialCreateOptions）
    /// </summary>
    Task<CredentialCreateOptions> StartRegistrationAsync(Guid userId, string? deviceName, CancellationToken ct = default);

    /// <summary>
    /// 完成註冊
    /// </summary>
    Task CompleteRegistrationAsync(Guid userId, AuthenticatorAttestationRawResponse attestation, string? deviceName, CancellationToken ct = default);

    /// <summary>
    /// 開始認證（取得 AssertionOptions）
    /// </summary>
    Task<AssertionOptions> StartAuthenticationAsync(string? email, CancellationToken ct = default);

    /// <summary>
    /// 完成認證（回傳 JWT AuthResponseDto）
    /// </summary>
    Task<AuthResponseDto> CompleteAuthenticationAsync(AuthenticatorAssertionRawResponse assertion, string? deviceInfo, string? ipAddress, CancellationToken ct = default);

    /// <summary>
    /// 取得使用者的所有 FIDO2 憑證
    /// </summary>
    Task<List<Fido2CredentialInfo>> GetCredentialsAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// 刪除憑證
    /// </summary>
    Task DeleteCredentialAsync(Guid credentialEntityId, Guid userId, CancellationToken ct = default);
}
