using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Roles.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 角色管理控制器
/// </summary>
[ApiController]
[Route("api/roles")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class RolesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<RolesController> _logger;

    public RolesController(IApplicationDbContext context, ILogger<RolesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 取得所有可用權限定義
    /// </summary>
    [HttpGet("permissions")]
    [ProducesResponseType(typeof(List<PermissionDefinitionDto>), StatusCodes.Status200OK)]
    public ActionResult<List<PermissionDefinitionDto>> GetPermissions()
    {
        var permissions = Enum.GetValues<UserPermission>()
            .Where(p => p != UserPermission.None && p != UserPermission.All)
            .Select(p => new PermissionDefinitionDto
            {
                Key = p.ToString(),
                Value = (long)p,
                Group = GetPermissionGroup(p)
            })
            .ToList();

        return Ok(permissions);
    }

    /// <summary>
    /// 取得所有角色
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<RoleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<RoleDto>>> GetAll(CancellationToken cancellationToken = default)
    {
        var roles = await _context.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                PermissionValue = r.PermissionValue,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(roles);
    }

    /// <summary>
    /// 取得角色
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleDto>> Get(Guid id, CancellationToken cancellationToken = default)
    {
        var r = await _context.Roles.FindAsync([id], cancellationToken);
        if (r == null) return NotFound(new { error = "角色不存在" });

        return Ok(new RoleDto
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            PermissionValue = r.PermissionValue,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        });
    }

    /// <summary>
    /// 建立角色
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleDto>> Create(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        // 檢查名稱是否重複
        var exists = await _context.Roles.AnyAsync(r => r.Name == request.Name, cancellationToken);
        if (exists) return BadRequest(new { error = "角色名稱已存在" });

        var role = new Role
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            PermissionValue = request.PermissionValue
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created role {RoleName}", role.Name);

        var dto = new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            PermissionValue = role.PermissionValue,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        };

        return CreatedAtAction(nameof(Get), new { id = role.Id }, dto);
    }

    /// <summary>
    /// 更新角色
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoleDto>> Update(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles.FindAsync([id], cancellationToken);
        if (role == null) return NotFound(new { error = "角色不存在" });

        // 檢查名稱是否與其他角色重複
        var nameConflict = await _context.Roles.AnyAsync(
            r => r.Name == request.Name && r.Id != id, cancellationToken);
        if (nameConflict) return BadRequest(new { error = "角色名稱已存在" });

        role.Name = request.Name;
        role.Description = request.Description;
        role.PermissionValue = request.PermissionValue;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated role {RoleName}", role.Name);

        return Ok(new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            PermissionValue = role.PermissionValue,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        });
    }

    /// <summary>
    /// 刪除角色
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles.FindAsync([id], cancellationToken);
        if (role == null) return NotFound(new { error = "角色不存在" });

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted role {RoleName}", role.Name);

        return NoContent();
    }

    private static string GetPermissionGroup(UserPermission p)
    {
        var val = (long)p;
        return val switch
        {
            < (1L << 10) => "系統管理",
            < (1L << 20) => "組織管理",
            < (1L << 30) => "計畫管理",
            < (1L << 40) => "表單管理",
            < (1L << 50) => "信件管理",
            _ => "資料與報表"
        };
    }
}

/// <summary>
/// 權限定義 DTO
/// </summary>
public class PermissionDefinitionDto
{
    public string Key { get; set; } = string.Empty;
    public long Value { get; set; }
    public string Group { get; set; } = string.Empty;
}
