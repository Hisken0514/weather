namespace Forma.Application.Features.Exports.DTOs;

/// <summary>
/// 匯出任務 DTO
/// </summary>
public class ExportDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public string? Filters { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public int? RecordCount { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid CreatedById { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? DownloadUrl { get; set; }
}
