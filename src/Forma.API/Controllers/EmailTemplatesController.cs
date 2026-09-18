using System.Text.Json;
using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.EmailTemplates.DTOs;
using Forma.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 信件範本管理控制器
/// </summary>
[ApiController]
[Route("api/email-templates")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class EmailTemplatesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<EmailTemplatesController> _logger;

    public EmailTemplatesController(IApplicationDbContext context, ILogger<EmailTemplatesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 取得所有信件範本
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<EmailTemplateDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<EmailTemplateDto>>> GetAll(CancellationToken cancellationToken = default)
    {
        var templates = await _context.EmailTemplates
            .OrderBy(t => t.TemplateKey)
            .Select(t => new EmailTemplateDto
            {
                Id = t.Id,
                TemplateKey = t.TemplateKey,
                Name = t.Name,
                Subject = t.Subject,
                HtmlContent = t.HtmlContent,
                IsEnabled = t.IsEnabled,
                AvailableVariables = DeserializeArray(t.AvailableVariables),
                TestVariables = DeserializeDict(t.TestVariables),
                UpdatedAt = t.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(templates);
    }

    /// <summary>
    /// 取得信件範本
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EmailTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmailTemplateDto>> Get(Guid id, CancellationToken cancellationToken = default)
    {
        var t = await _context.EmailTemplates.FindAsync([id], cancellationToken);
        if (t == null) return NotFound(new { error = "信件範本不存在" });

        return Ok(new EmailTemplateDto
        {
            Id = t.Id,
            TemplateKey = t.TemplateKey,
            Name = t.Name,
            Subject = t.Subject,
            HtmlContent = t.HtmlContent,
            IsEnabled = t.IsEnabled,
            AvailableVariables = DeserializeArray(t.AvailableVariables),
            TestVariables = DeserializeDict(t.TestVariables),
            UpdatedAt = t.UpdatedAt
        });
    }

    /// <summary>
    /// 更新信件範本
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(EmailTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmailTemplateDto>> Update(
        Guid id,
        [FromBody] UpdateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var t = await _context.EmailTemplates.FindAsync([id], cancellationToken);
        if (t == null) return NotFound(new { error = "信件範本不存在" });

        t.Name = request.Name;
        t.Subject = request.Subject;
        t.HtmlContent = request.HtmlContent;
        t.IsEnabled = request.IsEnabled;
        if (request.TestVariables != null)
            t.TestVariables = JsonSerializer.Serialize(request.TestVariables);

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated email template {TemplateKey}", t.TemplateKey);

        return Ok(new EmailTemplateDto
        {
            Id = t.Id,
            TemplateKey = t.TemplateKey,
            Name = t.Name,
            Subject = t.Subject,
            HtmlContent = t.HtmlContent,
            IsEnabled = t.IsEnabled,
            AvailableVariables = DeserializeArray(t.AvailableVariables),
            TestVariables = DeserializeDict(t.TestVariables),
            UpdatedAt = t.UpdatedAt
        });
    }

    /// <summary>
    /// 發送測試信件
    /// </summary>
    [HttpPost("send-test")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> SendTest(
        [FromBody] SendTestTemplateEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = await _context.EmailTemplates.FindAsync([request.TemplateId], cancellationToken);
        if (template == null) return NotFound(new { error = "信件範本不存在" });

        // TODO: 實際實作時使用 IEmailService 發送
        _logger.LogInformation(
            "Send test email for template {TemplateKey} to {Recipient}",
            template.TemplateKey, request.RecipientEmail);

        return Ok(new { message = "測試信件已發送" });
    }

    private static string[] DeserializeArray(string json)
    {
        try { return JsonSerializer.Deserialize<string[]>(json) ?? []; }
        catch { return []; }
    }

    private static Dictionary<string, string> DeserializeDict(string json)
    {
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new(); }
        catch { return new(); }
    }
}
