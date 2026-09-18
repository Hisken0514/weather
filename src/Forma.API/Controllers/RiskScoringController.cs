using Forma.Application.Common.Interfaces;
using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

[ApiController]
[Route("api/risk-scoring")]
[Authorize]
public class RiskScoringController : ControllerBase
{
    private readonly IRiskScoringService _scoringService;
    private readonly IRiskCalculationService _calculationService;
    private readonly ICurrentUserService _currentUser;

    public RiskScoringController(
        IRiskScoringService scoringService,
        IRiskCalculationService calculationService,
        ICurrentUserService currentUser)
    {
        _scoringService = scoringService;
        _calculationService = calculationService;
        _currentUser = currentUser;
    }

    // ─── 年度標準 CRUD ────────────────────────────────────────────────────────

    /// <summary>取得所有年度評分標準清單</summary>
    [HttpGet("schemes")]
    public async Task<ActionResult<List<SchemeListDto>>> GetSchemes(CancellationToken ct)
        => Ok(await _scoringService.GetSchemesAsync(ct));

    /// <summary>取得所有標準已用過的指標對應資料欄位（distinct），給新增/編輯指標時當下拉建議</summary>
    [HttpGet("indicator-canonical-keys")]
    public async Task<ActionResult<List<string>>> GetIndicatorCanonicalKeys(CancellationToken ct)
        => Ok(await _scoringService.GetDistinctIndicatorCanonicalKeysAsync(ct));

    /// <summary>取得單一年度評分標準（含完整計分規則）</summary>
    [HttpGet("schemes/{id:guid}")]
    public async Task<ActionResult<SchemeDetailDto>> GetScheme(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _scoringService.GetSchemeByIdAsync(id, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>新增年度評分標準</summary>
    [HttpPost("schemes")]
    public async Task<ActionResult> CreateScheme([FromBody] CreateSchemeRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _scoringService.CreateSchemeAsync(request, _currentUser.UserId!.Value, ct);
            return CreatedAtAction(nameof(GetScheme), new { id }, new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>更新年度評分標準（全量替換計分規則）</summary>
    [HttpPut("schemes/{id:guid}")]
    public async Task<ActionResult> UpdateScheme(Guid id, [FromBody] UpdateSchemeRequest request, CancellationToken ct)
    {
        try
        {
            await _scoringService.UpdateSchemeAsync(id, request, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>刪除年度評分標準（不可刪除生效中的標準）</summary>
    [HttpDelete("schemes/{id:guid}")]
    public async Task<ActionResult> DeleteScheme(Guid id, CancellationToken ct)
    {
        try
        {
            await _scoringService.DeleteSchemeAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>設定為生效標準（同時取消其他標準）</summary>
    [HttpPost("schemes/{id:guid}/activate")]
    public async Task<ActionResult> ActivateScheme(Guid id, CancellationToken ct)
    {
        try
        {
            await _scoringService.SetActiveSchemeAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>複製現有標準至新年度（方便只修改部分數值）</summary>
    [HttpPost("schemes/{id:guid}/clone")]
    public async Task<ActionResult<SchemeDetailDto>> CloneScheme(
        Guid id, [FromBody] CloneSchemeRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _scoringService.CloneSchemeAsync(id, request, _currentUser.UserId!.Value, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── 風險值計算 ───────────────────────────────────────────────────────────

    /// <summary>使用目前生效標準計算風險值（預覽用）</summary>
    [HttpPost("calculate")]
    public async Task<ActionResult<RiskCalculationResult>> Calculate(
        [FromBody] RiskCalculationInput input, CancellationToken ct)
    {
        try
        {
            return Ok(await _calculationService.CalculateAsync(input, null, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>使用指定標準計算風險值（比較不同年度用）</summary>
    [HttpPost("calculate/{schemeId:guid}")]
    public async Task<ActionResult<RiskCalculationResult>> CalculateWithScheme(
        Guid schemeId, [FromBody] RiskCalculationInput input, CancellationToken ct)
    {
        try
        {
            return Ok(await _calculationService.CalculateAsync(input, schemeId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
