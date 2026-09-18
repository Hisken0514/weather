namespace Forma.Application.Features.Auth.DTOs;

/// <summary>
/// 系統狀態 DTO
/// </summary>
public class SystemStatusDto
{
    /// <summary>
    /// 系統是否已初始化（是否有系統管理員）
    /// </summary>
    public bool IsInitialized { get; set; }

    /// <summary>
    /// 系統版本
    /// </summary>
    public string Version { get; set; } = "1.0.0";
}
