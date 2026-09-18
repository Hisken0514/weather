using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 轄區管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class RegionsController : ControllerBase
{
    private readonly IApplicationDbContext _db;

    public RegionsController(IApplicationDbContext db)
    {
        _db = db;
    }

    public record RegionDto(Guid Id, string Name, int SortOrder);
    public record CreateRegionRequest(string Name, int SortOrder = 0);
    public record UpdateRegionRequest(string Name, int SortOrder);

    /// <summary>
    /// 取得所有轄區（依排序）
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<RegionDto>>> GetAll(CancellationToken ct)
    {
        var regions = await _db.Regions
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Name)
            .Select(r => new RegionDto(r.Id, r.Name, r.SortOrder))
            .ToListAsync(ct);

        return Ok(regions);
    }

    /// <summary>
    /// 新增轄區（Admin）
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RegionDto>> Create([FromBody] CreateRegionRequest request, CancellationToken ct)
    {
        if (await _db.Regions.AnyAsync(r => r.Name == request.Name, ct))
            return BadRequest(new { message = $"轄區「{request.Name}」已存在" });

        var region = new Region { Name = request.Name.Trim(), SortOrder = request.SortOrder };
        _db.Regions.Add(region);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new RegionDto(region.Id, region.Name, region.SortOrder));
    }

    /// <summary>
    /// 更新轄區（Admin）
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RegionDto>> Update(Guid id, [FromBody] UpdateRegionRequest request, CancellationToken ct)
    {
        var region = await _db.Regions.FindAsync([id], ct);
        if (region is null) return NotFound();

        if (await _db.Regions.AnyAsync(r => r.Name == request.Name && r.Id != id, ct))
            return BadRequest(new { message = $"轄區「{request.Name}」已存在" });

        region.Name = request.Name.Trim();
        region.SortOrder = request.SortOrder;
        await _db.SaveChangesAsync(ct);

        return Ok(new RegionDto(region.Id, region.Name, region.SortOrder));
    }

    /// <summary>
    /// 刪除轄區（Admin）
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        var region = await _db.Regions.FindAsync([id], ct);
        if (region is null) return NotFound();

        _db.Regions.Remove(region);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }
}
