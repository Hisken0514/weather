using System.Text.Json;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Reports.DTOs;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 報告服務實作
/// </summary>
public class ReportService : IReportService
{
    private readonly IApplicationDbContext _context;

    public ReportService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<ReportDto> GetFormReportAsync(
        GetFormReportRequest request,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == request.FormId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 權限檢查：專案成員（Analyst以上）或系統管理員
        if (!request.IsSystemAdmin)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == form.ProjectId &&
                    pm.UserId == request.CurrentUserId &&
                    pm.RemovedAt == null,
                    cancellationToken);

            if (membership == null || membership.Role < ProjectRole.Analyst)
            {
                throw new UnauthorizedAccessException();
            }
        }

        // 查詢提交記錄
        var submissionsQuery = _context.FormSubmissions
            .Where(s => s.FormId == request.FormId)
            .AsNoTracking();

        if (request.StartDate.HasValue)
        {
            submissionsQuery = submissionsQuery.Where(s => s.SubmittedAt >= request.StartDate.Value);
        }
        if (request.EndDate.HasValue)
        {
            submissionsQuery = submissionsQuery.Where(s => s.SubmittedAt <= request.EndDate.Value);
        }

        var submissions = await submissionsQuery.ToListAsync(cancellationToken);

        // 統計各狀態數量
        var statusCounts = submissions
            .GroupBy(s => s.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        // 每日統計 (最近30天)
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30).Date;
        var dailyStats = submissions
            .Where(s => s.SubmittedAt >= thirtyDaysAgo)
            .GroupBy(s => s.SubmittedAt.Date)
            .Select(g => new DailySubmissionStat
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(d => d.Date)
            .ToList();

        // 欄位摘要分析
        var fieldSummaries = new List<FieldSummary>();
        try
        {
            var schemaDoc = JsonDocument.Parse(form.Schema);
            if (schemaDoc.RootElement.TryGetProperty("fields", out var fieldsElement))
            {
                foreach (var field in fieldsElement.EnumerateArray())
                {
                    if (field.TryGetProperty("name", out var nameElement) &&
                        field.TryGetProperty("type", out var typeElement))
                    {
                        var fieldName = nameElement.GetString() ?? "";
                        var fieldType = typeElement.GetString() ?? "";

                        var valueDistribution = new Dictionary<string, int>();
                        var responseCount = 0;

                        foreach (var submission in submissions)
                        {
                            try
                            {
                                var dataDoc = JsonDocument.Parse(submission.SubmissionData);
                                if (dataDoc.RootElement.TryGetProperty(fieldName, out var valueElement))
                                {
                                    responseCount++;
                                    var value = valueElement.ToString();
                                    if (!string.IsNullOrEmpty(value))
                                    {
                                        valueDistribution[value] = valueDistribution.GetValueOrDefault(value) + 1;
                                    }
                                }
                            }
                            catch { }
                        }

                        fieldSummaries.Add(new FieldSummary
                        {
                            FieldName = fieldName,
                            FieldType = fieldType,
                            ResponseCount = responseCount,
                            ValueDistribution = valueDistribution.Count <= 20 ? valueDistribution : null
                        });
                    }
                }
            }
        }
        catch { }

        return new ReportDto
        {
            FormId = form.Id,
            FormName = form.Name,
            TotalSubmissions = submissions.Count,
            SubmittedCount = statusCounts.GetValueOrDefault(SubmissionStatus.Submitted, 0),
            DraftCount = statusCounts.GetValueOrDefault(SubmissionStatus.Draft, 0),
            ApprovedCount = statusCounts.GetValueOrDefault(SubmissionStatus.Approved, 0),
            RejectedCount = statusCounts.GetValueOrDefault(SubmissionStatus.Rejected, 0),
            FirstSubmissionAt = submissions.MinBy(s => s.SubmittedAt)?.SubmittedAt,
            LastSubmissionAt = submissions.MaxBy(s => s.SubmittedAt)?.SubmittedAt,
            DailyStats = dailyStats,
            FieldSummaries = fieldSummaries
        };
    }
}
