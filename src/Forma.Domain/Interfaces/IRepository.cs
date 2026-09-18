using System.Linq.Expressions;
using Forma.Domain.Entities;

namespace Forma.Domain.Interfaces;

/// <summary>
/// 通用儲存庫介面
/// </summary>
/// <typeparam name="T">實體類型</typeparam>
public interface IRepository<T> where T : BaseEntity
{
    /// <summary>
    /// 根據 ID 取得實體
    /// </summary>
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得所有實體
    /// </summary>
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 根據條件取得實體
    /// </summary>
    Task<IReadOnlyList<T>> GetAsync(
        Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 根據條件取得第一筆實體
    /// </summary>
    Task<T?> GetFirstOrDefaultAsync(
        Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 新增實體
    /// </summary>
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// 批次新增實體
    /// </summary>
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新實體
    /// </summary>
    void Update(T entity);

    /// <summary>
    /// 刪除實體
    /// </summary>
    void Delete(T entity);

    /// <summary>
    /// 批次刪除實體
    /// </summary>
    void DeleteRange(IEnumerable<T> entities);

    /// <summary>
    /// 檢查是否存在符合條件的實體
    /// </summary>
    Task<bool> AnyAsync(
        Expression<Func<T, bool>> predicate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 計算符合條件的實體數量
    /// </summary>
    Task<int> CountAsync(
        Expression<Func<T, bool>>? predicate = null,
        CancellationToken cancellationToken = default);
}
