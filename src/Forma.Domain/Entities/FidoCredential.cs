namespace Forma.Domain.Entities;

/// <summary>
/// FIDO2 / Passkey 憑證
/// </summary>
public class FidoCredential : AuditableEntity
{
    /// <summary>
    /// 憑證 ID (WebAuthn credential ID)
    /// </summary>
    public byte[] CredentialId { get; set; } = null!;

    /// <summary>
    /// 公鑰
    /// </summary>
    public byte[] PublicKey { get; set; } = null!;

    /// <summary>
    /// 使用者識別碼
    /// </summary>
    public byte[] UserHandle { get; set; } = null!;

    /// <summary>
    /// 簽名計數器
    /// </summary>
    public uint SignatureCounter { get; set; }

    /// <summary>
    /// 關聯使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 裝置名稱
    /// </summary>
    public string? DeviceName { get; set; }

    /// <summary>
    /// Authenticator Attestation GUID
    /// </summary>
    public Guid? AaGuid { get; set; }

    /// <summary>
    /// 最後使用時間
    /// </summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// 關聯使用者
    /// </summary>
    public virtual User User { get; set; } = null!;
}
