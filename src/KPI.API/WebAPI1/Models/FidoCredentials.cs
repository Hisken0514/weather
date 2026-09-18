using System;
using System.Collections.Generic;

namespace WebAPI1.Models;

public partial class FidoCredentials
{
    public int? Id { get; set; }

    public int? UserId { get; set; }

    public string? CredentialI { get; set; }

    public string? PublicKey { get; set; }

    public string? UserHandle { get; set; }

    public int? SignatureCo { get; set; }

    public string? CredentialT { get; set; }

    public DateTime? RegDate { get; set; }

    public string? AaGuid { get; set; }

    public string? DeviceType { get; set; }

    public DateTime? LastUsed { get; set; }
}
