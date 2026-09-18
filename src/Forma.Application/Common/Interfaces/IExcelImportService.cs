using Forma.Application.Features.Supervision.DTOs;

namespace Forma.Application.Common.Interfaces;

/// <summary>
/// Excel 督導清冊匯入服務
/// </summary>
public interface IExcelImportService
{
    Task<ImportResult> ImportAsync(Guid campaignId, Stream excelStream, CancellationToken ct = default);
}
