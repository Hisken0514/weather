namespace Forma.Application.Services;

/// <summary>
/// 全資料庫工廠身分同步：工廠管理（SupervisedFactory）跟原始資料維護
/// （RiskAssessedFactory）任一邊存檔工廠名稱有變動時呼叫，以工廠登記編號為準，
/// 把新名稱同步到 FactoryMaster（主資料，沒有這個登記編號就建立最小一筆）、
/// 所有掛同一個登記編號的 SupervisedFactory、以及 RiskAssessedFactory。
/// </summary>
public interface IFactoryIdentitySyncService
{
    /// <summary>
    /// 同步工廠名稱。登記編號或名稱是空的就什麼都不做（沒有東西可以比對、也沒有
    /// 名稱可以同步)。
    /// </summary>
    Task SyncFactoryNameAsync(string? registrationNo, string? name, CancellationToken ct = default);
}
