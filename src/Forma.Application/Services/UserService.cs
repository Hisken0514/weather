using System.Text.Json;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Users.DTOs;
using Forma.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 使用者服務實作
/// </summary>
public class UserService : IUserService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IPasswordPolicyService _passwordPolicyService;
    private readonly IAuditService _audit;

    public UserService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IPasswordPolicyService passwordPolicyService,
        IAuditService audit)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _passwordPolicyService = passwordPolicyService;
        _audit = audit;
    }

    /// <inheritdoc />
    public async Task<PagedResult<UserListDto>> GetUsersAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users.AsNoTracking();

        // 搜尋篩選
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var searchTerm = request.SearchTerm.ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(searchTerm) ||
                u.Email.ToLower().Contains(searchTerm) ||
                (u.Department != null && u.Department.ToLower().Contains(searchTerm)));
        }

        // 啟用狀態篩選
        if (request.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == request.IsActive.Value);
        }

        // 計算總筆數
        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "username" => request.SortDescending
                ? query.OrderByDescending(u => u.Username)
                : query.OrderBy(u => u.Username),
            "email" => request.SortDescending
                ? query.OrderByDescending(u => u.Email)
                : query.OrderBy(u => u.Email),
            "lastloginat" => request.SortDescending
                ? query.OrderByDescending(u => u.LastLoginAt)
                : query.OrderBy(u => u.LastLoginAt),
            "createdat" => request.SortDescending
                ? query.OrderByDescending(u => u.CreatedAt)
                : query.OrderBy(u => u.CreatedAt),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        // 分頁
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var users = await query
            .Include(u => u.IndustrialParks)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserListDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                RoleId = u.RoleId,
                RoleName = u.Role != null ? u.Role.Name : null,
                Department = u.Department,
                IsActive = u.IsActive,
                LastLoginAt = u.LastLoginAt,
                IndustrialParks = u.IndustrialParks.Select(p => p.IndustrialParkName).OrderBy(p => p).ToList()
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<UserListDto>
        {
            Items = users,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<UserProfileDto> GetUserByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.IndustrialParks)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        return MapToUserProfileDto(user);
    }

    /// <inheritdoc />
    public async Task<UserProfileDto> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        return MapToUserProfileDto(user);
    }

    /// <inheritdoc />
    public async Task<UserProfileDto> UpdateUserAsync(
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        // 檢查使用者名稱是否已被其他人使用
        if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
        {
            var usernameExists = await _context.Users
                .AnyAsync(u => u.Username == request.Username && u.Id != userId, cancellationToken);

            if (usernameExists)
            {
                throw new InvalidOperationException("此使用者名稱已被使用");
            }

            user.Username = request.Username;
        }

        // 檢查電子郵件是否已被其他人使用
        if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
        {
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == request.Email && u.Id != userId, cancellationToken);

            if (emailExists)
            {
                throw new InvalidOperationException("此電子郵件已被使用");
            }

            user.Email = request.Email;
        }

        // 更新自訂角色
        if (request.RoleId.HasValue)
            user.RoleId = request.RoleId.Value == Guid.Empty ? null : request.RoleId.Value;

        // 更新其他欄位
        var changes = new Dictionary<string, object?>();

        if (request.Department != null)
        {
            changes["department"] = new { from = user.Department, to = request.Department };
            user.Department = request.Department;
        }

        if (request.JobTitle != null)
        {
            changes["jobTitle"] = new { from = user.JobTitle, to = request.JobTitle };
            user.JobTitle = request.JobTitle;
        }

        if (request.PhoneNumber != null)
        {
            changes["phoneNumber"] = new { from = user.PhoneNumber, to = request.PhoneNumber };
            user.PhoneNumber = request.PhoneNumber;
        }

        _audit.Log("USER_UPDATED", "User", userId,
            changes.Count > 0 ? JsonSerializer.Serialize(changes) : null);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToUserProfileDto(user);
    }

    /// <inheritdoc />
    public async Task<bool> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        // 驗證目前密碼
        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("目前密碼不正確");
        }

        // 密碼策略驗證
        var (isValid, errors) = await _passwordPolicyService.ValidatePasswordAsync(request.NewPassword, cancellationToken);
        if (!isValid)
        {
            throw new InvalidOperationException(string.Join("；", errors));
        }

        // 更新密碼
        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);

        // 撤銷所有 Refresh Token (強制重新登入)
        var activeTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedReason = "密碼已變更";
        }

        _audit.Log("PASSWORD_CHANGED", "User", userId);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    /// <inheritdoc />
    public async Task<bool> ToggleUserStatusAsync(
        Guid userId,
        bool activate,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        user.IsActive = activate;

        // 如果停用使用者，撤銷所有 Refresh Token
        if (!activate)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in activeTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedReason = "帳號已被停用";
            }
        }

        _audit.Log(activate ? "USER_ACTIVATED" : "USER_DEACTIVATED", "User", userId);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    #region Private Methods

    private static UserProfileDto MapToUserProfileDto(Domain.Entities.User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        RoleId = user.RoleId,
        RoleName = user.Role?.Name,
        Department = user.Department,
        JobTitle = user.JobTitle,
        PhoneNumber = user.PhoneNumber,
        IsActive = user.IsActive,
        LastLoginAt = user.LastLoginAt,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt,
        IndustrialParks = user.IndustrialParks.Select(p => p.IndustrialParkName).OrderBy(p => p).ToList()
    };

    #endregion
}
