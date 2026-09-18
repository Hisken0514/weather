using Forma.Application.Features.FactoryRisk.DTOs;

namespace Forma.Application.Common.Interfaces;

public interface IFactoryRiskImportService
{
    /// <summary>
    /// 匯入全台工廠風險原始資料。固定範本格式（單一工作表，表頭是欄位名稱），跟哪一年的
    /// 政府原生報表長怎樣無關；指標欄由表頭文字（CanonicalKey）動態決定，不需要改程式。
    /// 只存原始輸入值，不存已經算好的分數，也不綁定任何特定年度的評分標準。
    /// <paramref name="dataYear"/> 是這份資料代表的資料年度（跟評分標準的年度是兩件事），
    /// 同一家工廠、同一個資料年度重新匯入會整份覆蓋；不同資料年度各自保留一份快照。
    /// </summary>
    Task<ImportFactoryRiskDataResult> ImportAsync(int dataYear, Stream excelStream, CancellationToken ct = default);
}
