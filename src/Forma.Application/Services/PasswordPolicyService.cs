using System.Text.RegularExpressions;
using Forma.Application.Features.SystemSettings.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 密碼策略驗證服務實作
/// </summary>
public class PasswordPolicyService : IPasswordPolicyService
{
    private readonly ISystemSettingService _systemSettingService;

    public PasswordPolicyService(ISystemSettingService systemSettingService)
    {
        _systemSettingService = systemSettingService;
    }

    /// <inheritdoc />
    public async Task<(bool IsValid, List<string> Errors)> ValidatePasswordAsync(
        string password, CancellationToken cancellationToken = default)
    {
        var policy = await _systemSettingService.GetSettingAsync<PasswordPolicyDto>("PasswordPolicy", cancellationToken);

        var errors = new List<string>();

        if (password.Length < policy.MinLength)
            errors.Add($"密碼長度至少需要 {policy.MinLength} 個字元");

        if (policy.RequireUppercase && !Regex.IsMatch(password, @"[A-Z]"))
            errors.Add("密碼需包含至少一個大寫字母");

        if (policy.RequireLowercase && !Regex.IsMatch(password, @"[a-z]"))
            errors.Add("密碼需包含至少一個小寫字母");

        if (policy.RequireDigit && !Regex.IsMatch(password, @"\d"))
            errors.Add("密碼需包含至少一個數字");

        if (policy.RequireSpecialCharacter && !Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?`~]"))
            errors.Add("密碼需包含至少一個特殊字元");

        return (errors.Count == 0, errors);
    }
}
