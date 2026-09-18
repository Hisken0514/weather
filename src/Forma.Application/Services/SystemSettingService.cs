using System.Text.Json;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Forma.Application.Services;

/// <summary>
/// 系統設定服務實作
/// </summary>
public class SystemSettingService : ISystemSettingService
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<SystemSettingService> _logger;

    public SystemSettingService(IApplicationDbContext context, ILogger<SystemSettingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<T> GetSettingAsync<T>(string category, CancellationToken cancellationToken = default) where T : class, new()
    {
        try
        {
            var setting = await _context.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Category == category, cancellationToken);

            if (setting == null)
            {
                // 如果找不到，返回預設值
                return new T();
            }

            var result = JsonSerializer.Deserialize<T>(setting.Value);
            return result ?? new T();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching settings for category {Category}", category);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task UpdateSettingAsync<T>(string category, T settings, CancellationToken cancellationToken = default) where T : class
    {
        try
        {
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(x => x.Category == category, cancellationToken);

            var jsonValue = JsonSerializer.Serialize(settings);

            if (setting == null)
            {
                // 新增
                setting = new SystemSetting
                {
                    Category = category,
                    Value = jsonValue,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                // 更新
                setting.Value = jsonValue;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating settings for category {Category}", category);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<List<SystemSettingDto>> GetAllCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .Select(s => new SystemSettingDto
            {
                Id = s.Id,
                Category = s.Category,
                Description = s.Description,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return settings;
    }
}
