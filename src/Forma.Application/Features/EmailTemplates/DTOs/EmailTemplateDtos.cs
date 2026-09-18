using System.Text.Json;

namespace Forma.Application.Features.EmailTemplates.DTOs;

/// <summary>
/// 信件範本 DTO
/// </summary>
public class EmailTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string[] AvailableVariables { get; set; } = [];
    public Dictionary<string, string> TestVariables { get; set; } = new();
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// 更新信件範本請求
/// </summary>
public class UpdateEmailTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public Dictionary<string, string>? TestVariables { get; set; }
}

/// <summary>
/// 發送測試信件請求
/// </summary>
public class SendTestTemplateEmailRequest
{
    public Guid TemplateId { get; set; }
    public string RecipientEmail { get; set; } = string.Empty;
    public Dictionary<string, string> Variables { get; set; } = new();
}
