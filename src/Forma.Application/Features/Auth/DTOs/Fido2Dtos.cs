using Fido2NetLib;

namespace Forma.Application.Features.Auth.DTOs;

/// <summary>
/// FIDO2 註冊完成請求
/// </summary>
public class Fido2RegisterCompleteRequest
{
    /// <summary>
    /// Attestation 回應
    /// </summary>
    public AuthenticatorAttestationRawResponse AttestationResponse { get; set; } = null!;

    /// <summary>
    /// 裝置名稱
    /// </summary>
    public string? DeviceName { get; set; }
}

/// <summary>
/// FIDO2 認證開始請求
/// </summary>
public class Fido2AuthenticateStartRequest
{
    /// <summary>
    /// Email（可選，指定特定使用者）
    /// </summary>
    public string? Email { get; set; }
}

/// <summary>
/// FIDO2 認證完成請求
/// </summary>
public class Fido2AuthenticateCompleteRequest
{
    /// <summary>
    /// Assertion 回應
    /// </summary>
    public AuthenticatorAssertionRawResponse AssertionResponse { get; set; } = null!;
}

/// <summary>
/// FIDO2 憑證資訊
/// </summary>
public class Fido2CredentialInfo
{
    public Guid Id { get; set; }
    public string? DeviceName { get; set; }
    public Guid? AaGuid { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}
