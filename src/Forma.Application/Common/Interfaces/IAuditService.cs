namespace Forma.Application.Common.Interfaces;

public interface IAuditService
{
    /// <summary>
    /// 寫入一筆帳號操作稽核紀錄（與當次 SaveChangesAsync 一起提交）
    /// </summary>
    void Log(string action, string entityType, Guid? entityId, string? changes = null);
}
