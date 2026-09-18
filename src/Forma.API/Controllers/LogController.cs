using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Logs.DTOs;
using Forma.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 系統日誌查詢控制器
/// </summary>
[ApiController]
[Route("api/logs")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class LogController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<LogController> _logger;

    public LogController(IApplicationDbContext context, ILogger<LogController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 分頁查詢操作日誌
    /// </summary>
    /// <param name="parameters">查詢參數</param>
    /// <param name="cancellationToken">取消令牌</param>
    [HttpGet("action")]
    [ProducesResponseType(typeof(PagedResult<ActionLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ActionLogDto>>> GetActionLogs(
        [FromQuery] ActionLogQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting action logs with parameters: {@Parameters}", parameters);

        var query = _context.ActionLogs.AsQueryable();

        // 使用者篩選
        if (!string.IsNullOrWhiteSpace(parameters.UserId))
            query = query.Where(l => l.UserId == parameters.UserId);

        // 動作類型篩選
        if (!string.IsNullOrWhiteSpace(parameters.ActionType))
            query = query.Where(l => l.ActionType == parameters.ActionType);

        // 日期篩選
        if (parameters.StartDate.HasValue)
        {
            var startDateTime = DateTime.SpecifyKind(
                parameters.StartDate.Value.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt >= startDateTime);
        }

        if (parameters.EndDate.HasValue)
        {
            var endDateTime = DateTime.SpecifyKind(
                parameters.EndDate.Value.ToDateTime(TimeOnly.MaxValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt <= endDateTime);
        }

        // 關鍵字搜尋
        if (!string.IsNullOrWhiteSpace(parameters.Search))
            query = query.Where(l =>
                (l.ActionName != null && l.ActionName.Contains(parameters.Search)) ||
                (l.UserName != null && l.UserName.Contains(parameters.Search)) ||
                (l.EntityName != null && l.EntityName.Contains(parameters.Search)) ||
                (l.Description != null && l.Description.Contains(parameters.Search)));

        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = parameters.Descending
            ? query.OrderByDescending(l => l.CreatedAt)
            : query.OrderBy(l => l.CreatedAt);

        var items = await query
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(l => new ActionLogDto
            {
                Id = l.Id,
                ActionType = l.ActionType,
                ActionName = l.ActionName,
                UserId = l.UserId,
                UserName = l.UserName,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                EntityName = l.EntityName,
                Description = l.Description,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent,
                IsSuccess = l.IsSuccess,
                ErrorMessage = l.ErrorMessage,
                ExecutionDuration = l.ExecutionDuration,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<ActionLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = parameters.PageNumber,
            PageSize = parameters.PageSize
        });
    }

    /// <summary>
    /// 獲取操作日誌統計資料
    /// </summary>
    /// <param name="startDate">開始日期</param>
    /// <param name="endDate">結束日期</param>
    /// <param name="cancellationToken">取消令牌</param>
    [HttpGet("action/statistics")]
    [ProducesResponseType(typeof(ActionLogStatisticsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ActionLogStatisticsDto>> GetActionLogStatistics(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting action log statistics from {StartDate} to {EndDate}", startDate, endDate);

        var query = _context.ActionLogs.AsQueryable();

        // 日期篩選 (使用 UTC 時間)
        if (startDate.HasValue)
        {
            var startDateTime = DateTime.SpecifyKind(
                startDate.Value.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt >= startDateTime);
        }

        if (endDate.HasValue)
        {
            var endDateTime = DateTime.SpecifyKind(
                endDate.Value.ToDateTime(TimeOnly.MaxValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt <= endDateTime);
        }

        // 基本統計
        var totalCount = await query.CountAsync(cancellationToken);
        var successCount = await query.CountAsync(l => l.IsSuccess, cancellationToken);
        var failureCount = totalCount - successCount;

        // 平均執行時間
        var avgDuration = totalCount > 0
            ? await query.Where(l => l.ExecutionDuration.HasValue)
                .AverageAsync(l => (double?)l.ExecutionDuration, cancellationToken) ?? 0
            : 0;

        // 操作類型分佈
        var actionTypeDistribution = await query
            .Where(l => l.ActionType != null)
            .GroupBy(l => l.ActionType!)
            .Select(g => new { Key = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        // 實體類型分佈
        var entityTypeDistribution = await query
            .Where(l => l.EntityType != null)
            .GroupBy(l => l.EntityType!)
            .Select(g => new { Key = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        // 每日趨勢
        var dailyTrend = await query
            .GroupBy(l => l.CreatedAt.Date)
            .Select(g => new ActionLogDailyTrendItem
            {
                Date = DateOnly.FromDateTime(g.Key),
                Total = g.Count(),
                Success = g.Count(l => l.IsSuccess),
                Failure = g.Count(l => !l.IsSuccess)
            })
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

        var result = new ActionLogStatisticsDto
        {
            TotalCount = totalCount,
            SuccessCount = successCount,
            FailureCount = failureCount,
            AvgExecutionDuration = Math.Round(avgDuration, 2),
            ActionTypeDistribution = actionTypeDistribution,
            EntityTypeDistribution = entityTypeDistribution,
            DailyTrend = dailyTrend
        };

        return Ok(result);
    }

    /// <summary>
    /// 獲取操作日誌詳情
    /// </summary>
    /// <param name="id">日誌 ID</param>
    /// <param name="cancellationToken">取消令牌</param>
    [HttpGet("action/{id:long}")]
    [ProducesResponseType(typeof(ActionLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActionLogDto>> GetActionLogById(
        long id,
        CancellationToken cancellationToken = default)
    {
        var log = await _context.ActionLogs
            .Where(l => l.Id == id)
            .Select(l => new ActionLogDto
            {
                Id = l.Id,
                ActionType = l.ActionType,
                ActionName = l.ActionName,
                UserId = l.UserId,
                UserName = l.UserName,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                EntityName = l.EntityName,
                Description = l.Description,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent,
                IsSuccess = l.IsSuccess,
                ErrorMessage = l.ErrorMessage,
                ExecutionDuration = l.ExecutionDuration,
                CreatedAt = l.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (log == null)
            return NotFound(new { error = "操作日誌不存在" });

        return Ok(log);
    }

    /// <summary>
    /// 分頁查詢帳號稽核紀錄
    /// </summary>
    [HttpGet("audit")]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetAuditLogs(
        [FromQuery] AuditLogQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(parameters.Action))
            query = query.Where(a => a.Action == parameters.Action);

        if (!string.IsNullOrWhiteSpace(parameters.EntityType))
            query = query.Where(a => a.EntityType == parameters.EntityType);

        if (parameters.StartDate.HasValue)
        {
            var startDateTime = DateTime.SpecifyKind(
                parameters.StartDate.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            query = query.Where(a => a.Timestamp >= startDateTime);
        }

        if (parameters.EndDate.HasValue)
        {
            var endDateTime = DateTime.SpecifyKind(
                parameters.EndDate.Value.ToDateTime(TimeOnly.MaxValue), DateTimeKind.Utc);
            query = query.Where(a => a.Timestamp <= endDateTime);
        }

        if (!string.IsNullOrWhiteSpace(parameters.Search))
            query = query.Where(a =>
                (a.User != null && a.User.Username.Contains(parameters.Search)) ||
                a.Action.Contains(parameters.Search) ||
                a.EntityType.Contains(parameters.Search));

        var totalCount = await query.CountAsync(cancellationToken);

        query = parameters.Descending
            ? query.OrderByDescending(a => a.Timestamp)
            : query.OrderBy(a => a.Timestamp);

        var items = await query
            .Include(a => a.User)
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.User != null ? a.User.Username : null,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Changes = a.Changes,
                Timestamp = a.Timestamp,
                IpAddress = a.IpAddress
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<AuditLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = parameters.PageNumber,
            PageSize = parameters.PageSize
        });
    }

    /// <summary>
    /// 分頁查詢郵件日誌
    /// </summary>
    [HttpGet("email")]
    [ProducesResponseType(typeof(PagedResult<EmailLogDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<EmailLogDto>>> GetEmailLogs(
        [FromQuery] EmailLogQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting email logs with parameters: {@Parameters}", parameters);

        var query = _context.EmailLogs.AsQueryable();

        // 範本篩選
        if (!string.IsNullOrWhiteSpace(parameters.TemplateKey))
            query = query.Where(l => l.TemplateKey == parameters.TemplateKey);

        // 成功/失敗篩選
        if (parameters.IsSuccess.HasValue)
            query = query.Where(l => l.IsSuccess == parameters.IsSuccess.Value);

        // 日期篩選
        if (parameters.StartDate.HasValue)
        {
            var startDateTime = DateTime.SpecifyKind(
                parameters.StartDate.Value.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.SentAt >= startDateTime);
        }

        if (parameters.EndDate.HasValue)
        {
            var endDateTime = DateTime.SpecifyKind(
                parameters.EndDate.Value.ToDateTime(TimeOnly.MaxValue),
                DateTimeKind.Utc);
            query = query.Where(l => l.SentAt <= endDateTime);
        }

        // 關鍵字搜尋
        if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            query = query.Where(l =>
                l.RecipientEmail.Contains(parameters.SearchTerm) ||
                (l.RecipientName != null && l.RecipientName.Contains(parameters.SearchTerm)) ||
                l.Subject.Contains(parameters.SearchTerm) ||
                (l.UserName != null && l.UserName.Contains(parameters.SearchTerm)));

        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = parameters.SortDescending
            ? query.OrderByDescending(l => l.SentAt)
            : query.OrderBy(l => l.SentAt);

        var items = await query
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(l => new EmailLogDto
            {
                Id = l.Id,
                RecipientEmail = l.RecipientEmail,
                RecipientName = l.RecipientName,
                Subject = l.Subject,
                TemplateKey = l.TemplateKey,
                IsSuccess = l.IsSuccess,
                ErrorMessage = l.ErrorMessage,
                SentAt = l.SentAt,
                UserId = l.UserId,
                UserName = l.UserName
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<EmailLogDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = parameters.PageNumber,
            PageSize = parameters.PageSize
        });
    }

    /// <summary>
    /// 取得郵件日誌詳情
    /// </summary>
    [HttpGet("email/{id:long}")]
    [ProducesResponseType(typeof(EmailLogDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmailLogDto>> GetEmailLogById(
        long id,
        CancellationToken cancellationToken = default)
    {
        var log = await _context.EmailLogs
            .Where(l => l.Id == id)
            .Select(l => new EmailLogDto
            {
                Id = l.Id,
                RecipientEmail = l.RecipientEmail,
                RecipientName = l.RecipientName,
                Subject = l.Subject,
                TemplateKey = l.TemplateKey,
                IsSuccess = l.IsSuccess,
                ErrorMessage = l.ErrorMessage,
                SentAt = l.SentAt,
                UserId = l.UserId,
                UserName = l.UserName
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (log == null)
            return NotFound(new { error = "郵件日誌不存在" });

        return Ok(log);
    }
}
