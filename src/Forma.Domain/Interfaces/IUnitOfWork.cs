namespace Forma.Domain.Interfaces;

/// <summary>
/// 工作單元介面
/// </summary>
public interface IUnitOfWork : IDisposable
{
    /// <summary>
    /// 儲存所有變更
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 開始交易
    /// </summary>
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 提交交易
    /// </summary>
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 回滾交易
    /// </summary>
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
