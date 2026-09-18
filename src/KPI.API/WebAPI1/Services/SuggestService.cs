using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WebAPI1.Context;
using WebAPI1.Entities;
using Exception = System.Exception;
using File = System.IO.File;

namespace WebAPI1.Services;

public class SuggestImportConfirmDto
{
    public int OrganizationId { get; set; }
    public List<SuggestmanyRow> Rows { get; set; }
}

public class DateOnlyJsonConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-dd";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var str = reader.GetString();
        return DateTime.ParseExact(str!, Format, null);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString(Format));
    }
}
public class SuggestmanyRow
{
    public int OrganizationId { get; set; }
    public string Organization { get; set; }
    [Column(TypeName = "date")]
    [JsonConverter(typeof(DateOnlyJsonConverter))]
    public DateTime Date { get; set; }
    public string FieldName { get; set; }
    public string UserName { get; set; }
    public string SuggestionContent { get; set; }
    public string? ImproveDetails { get; set; }
    public string SuggestionType { get; set; }
    public string SuggestEventType { get; set; }
    public string? RespDept { get; set; }
    public int IsAdopted { get; set; }
    
    public string IsAdoptedName { get; set; }
    public int? Manpower { get; set; }
    public decimal? Budget { get; set; }
    
    public int Completed { get; set; }
    public string? CompletedName { get; set; }
    public int? DoneYear { get; set; }
    public int? DoneMonth { get; set; }
    public int ParallelExec { get; set; }
    public string? ParallelExecName { get; set; }
    public string? ExecPlan { get; set; }
    public string? Remark { get; set; }
}
public class SuggestDetailDto
{
    public int Id { get; set; }
    [Column(TypeName = "date")]
    [JsonConverter(typeof(DateOnlyJsonConverter))]
    public DateTime Date { get; set; }
    public int? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string? SuggestEventTypeName { get; set; }
    public List<SuggestReportDto> Reports { get; set; } = new();
}

public class SuggestReportDto
{
    public int Id { get; set; }
    public string? Committee { get; set; }
    public string? Suggestion { get; set; }
    public string? SuggestionType { get; set; }
    public string? RespDept { get; set; }
    public string? ImproveDetails { get; set; }
    public string? IsAdopted { get; set; }
    public string? Completed { get; set; }
    public int? DoneYear { get; set; }
    public int? DoneMonth { get; set; }
    public string? ParallelExec { get; set; }
    public string? ExecPlan { get; set; }
    public string? Remark { get; set; }
    public string? Category { get; set; }
    public int? Manpower { get; set; }
    public decimal? Budget { get; set; }
}
public class AddSuggestDto
{
    public int OrganizationId { get; set; }
    public DateTime Date { get; set; }
    public string Category { get; set; }
    public string? EnCategory { get; set; }
    public string Committee { get; set; } = null!;
    public string Suggestion { get; set; } = null!;
    public string SuggestionType { get; set; } = null!;
    public string SuggestEventType { get; set; }
    public string? Department { get; set; }
    public IsAdopted? IsAdopted { get; set; }
    public string? AdoptedOther { get; set; }
    public string? ImproveDetail { get; set; }
    public int? Manpower { get; set; }
    public decimal? Budget { get; set; }
    public IsAdopted? IsCompleted { get; set; }
    public string? CompletedOther { get; set; }
    public string? DoneYear { get; set; }
    public string? DoneMonth { get; set; }
    public IsAdopted? IsParallel { get; set; }
    public string? ParallelOther { get; set; }
    public string? ExecPlan { get; set; }
    public string? Remark { get; set; }
}

public class SuggestDto
{
    public int Id { get; set; }
    [Column(TypeName = "date")]
    [JsonConverter(typeof(DateOnlyJsonConverter))]
    public DateTime Date { get; set; }
    public string SuggestionContent { get; set; }
    public string SuggestEventTypeName { get; set; }
    public string SuggestionTypeName { get; set; }

    public string IsAdopted { get; set; }
    public string? RespDept { get; set; }
    public string? ImproveDetails { get; set; }
    public int? Manpower { get; set; }
    public decimal? Budget { get; set; }

    public string Completed { get; set; }
    public int? DoneYear { get; set; }
    public int? DoneMonth { get; set; }

    public string ParallelExec { get; set; }
    public string? ExecPlan { get; set; }
    public string? Remark { get; set; }
    public string? OrganizationName { get; set; }
    public int? organizationId { get; set; }
    public int SuggestDateId { get; set; }
    public string? KpiFieldName { get; set; }
    public string? UserName { get; set; }
}

public interface ISuggestService
{
    Task<List<SuggestDto>> GetAllSuggestsAsync(int? organizationId = null, int? startYear = null, int? endYear = null, string? keyword = null);
    Task<List<SuggestDto>> GetAllSuggestDatesAsync(int? organizationId = null, string? keyword = null);
    Task<SuggestDetailDto?> GetSuggestDetailAsync(int id);
    Task<(bool Success, string Message)> ImportSingleSuggestAsync(AddSuggestDto dto);
    Task<List<SuggestmanyRow>> ParseExcelAsync(Stream fileStream, int organizationId);

    Task<(bool Success, string Message)> BatchInsertSuggestAsync(int organizationId, List<SuggestmanyRow> rows);

    Task<(string FileName, byte[] Content)> GenerateTemplateAsync(int organizationId);
    Task<List<object>> PreviewAsync(IFormFile file);
    Task<(bool Success, string Message)> ImportAsync(IFormFile file);
    Task<List<object>> GetReportsByOrganizationAsync(int organizationId);
    Task<bool> UpdateSuggestReportsAsync(List<SuggestDto> reports);
    Task<byte[]> GenerateSuggestReportPdfAsync(int organizationId);
    Task<(bool Success, string Message)> UpdateSuggestDateOrganizationAsync(int suggestDateId, int newOrganizationId);
    Task<(bool Success, string Message)> FixReportsOrganizationAsync(List<int> reportIds, int newOrganizationId);
    Task<SuggestSubmissionStatus?> CheckSubmissionStatusAsync(int organizationId, int year, string period);
    Task<(bool Success, string Message)> RecordSubmissionAsync(int organizationId, int year, string period, Guid? userId, string? userName);
    Task<(bool Success, string Message)> SelfReturnSuggestAsync(int organizationId, int year, string period);
}

public class SuggestService:ISuggestService
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<SuggestService> _logger;
    private readonly IOrganizationService _organizationService;

    public SuggestService(ISHAuditDbcontext db,ILogger<SuggestService> logger,IOrganizationService organizationService)
    {
        _db = db;
        _logger = logger;
        _organizationService = organizationService;
    }
    private static DateTime? GetCellDate(ICell cell)
    {
        if (cell == null) return null;
        if (cell.CellType == CellType.Numeric && DateUtil.IsCellDateFormatted(cell))
        {
            return (DateTime)cell.DateCellValue;
        }

        // 若是用文字輸入日期，也試圖轉換
        var raw = cell.ToString()?.Trim();
        if (DateTime.TryParse(raw, out var parsed))
            return parsed;

        return null;
    }
    private static string GetCellString(ICell cell)
    {
        if (cell == null) return string.Empty;

        var text = cell.ToString()?.Trim() ?? string.Empty;
        return text == "-" ? string.Empty : text;
    }
    private static decimal? GetCellDecimal(ICell cell)
    {
        if (cell == null) return null;

        if (cell.CellType == CellType.Numeric)
        {
            return (decimal)cell.NumericCellValue;
        }
        else
        {
            var text = cell.ToString()?.Trim();

            // ✅ 如果是空字串或者 "-"，就當成 null
            if (string.IsNullOrEmpty(text) || text == "-")
            {
                return null;
            }

            return decimal.TryParse(text, out var result) ? result : null;
        }
    }
    public static IsAdopted ParseIsAdopted(string? input)
    {
        if (string.IsNullOrWhiteSpace(input) || input == "-" || input.ToUpper() == "NA")
            return IsAdopted.否;

        return Enum.TryParse<IsAdopted>(input.Trim(), out var result)
            ? result
            : IsAdopted.否;
    }
    public async Task<List<SuggestDto>> GetAllSuggestsAsync(
    int? organizationId = null,
    int? startYear = null,
    int? endYear = null,
    string? keyword = null)
    {
        var query = _db.SuggestReports
            .Include(r => r.SuggestDate)
                .ThenInclude(d => d.Organization)
            .Include(r => r.SuggestDate.SuggestEventType)
            .Include(r => r.SuggestionType)
            .Include(r => r.KpiField)
            .Include(r => r.User)
            .AsQueryable();

        // 篩選：組織（含下層）
        if (organizationId.HasValue)
        {
            var orgIds = _organizationService.GetDescendantOrganizationIds(organizationId.Value);
            query = query.Where(r => orgIds.Contains(r.SuggestDate.OrganizationId ?? 0));
        }

        // 篩選：年份（根據 SuggestDate.Date）
        if (startYear.HasValue)
        {
            query = query.Where(r => r.SuggestDate.Date.Year >= startYear.Value);
        }

        if (endYear.HasValue)
        {
            query = query.Where(r => r.SuggestDate.Date.Year <= endYear.Value);
        }

        // 模糊搜尋（跨表欄位）
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            keyword = keyword.Trim();
            query = query.Where(r =>
                r.SuggestionContent.Contains(keyword) ||
                r.RespDept.Contains(keyword) ||
                r.ImproveDetails.Contains(keyword) ||
                r.ExecPlan.Contains(keyword) ||
                r.Remark.Contains(keyword) ||
                r.SuggestDate.SuggestEventType.Name.Contains(keyword) ||
                r.SuggestionType.Name.Contains(keyword) ||
                r.SuggestDate.Organization.Name.Contains(keyword) ||
                r.KpiField.field.Contains(keyword) ||
                r.User.Nickname.Contains(keyword)
            );
        }

        var data = await query
            .OrderByDescending(r => r.SuggestDate.Date)
            .ToListAsync();

        return data.Select(r => new SuggestDto
        {
            Id = r.Id,
            Date = r.SuggestDate.Date,
            SuggestionContent = r.SuggestionContent,
            SuggestEventTypeName = r.SuggestDate.SuggestEventType?.Name,
            SuggestionTypeName = r.SuggestionType?.Name,
            IsAdopted = r.IsAdopted.ToString(),
            RespDept = r.RespDept,
            ImproveDetails = r.ImproveDetails,
            Manpower = r.Manpower,
            Budget = r.Budget,
            Completed = r.Completed.ToString(),
            DoneYear = r.DoneYear,
            DoneMonth = r.DoneMonth,
            ParallelExec = r.ParallelExec.ToString(),
            ExecPlan = r.ExecPlan,
            Remark = r.Remark,
            OrganizationName = r.SuggestDate.Organization?.Name,
            organizationId = r.SuggestDate.OrganizationId,
            SuggestDateId = r.SuggestDateId,
            KpiFieldName = r.KpiField?.field,
            UserName = r.User?.Nickname,
        }).ToList();
    }
    
    public async Task<List<SuggestDto>> GetAllSuggestDatesAsync(
        int? organizationId = null,
        string? keyword = null)
    {
        var query = _db.SuggestDates
            .Include(d => d.Organization)
            .Include(d => d.SuggestEventType)
            .AsQueryable();

        if (organizationId.HasValue)
        {
            var orgIds = _organizationService.GetDescendantOrganizationIds(organizationId.Value);
            query = query.Where(d => orgIds.Contains(d.OrganizationId ?? 0));
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            keyword = keyword.Trim();
            query = query.Where(d =>
                d.SuggestReports.Any(r =>
                    r.SuggestionContent.Contains(keyword) ||
                    r.RespDept.Contains(keyword) ||
                    r.ImproveDetails.Contains(keyword) ||
                    r.ExecPlan.Contains(keyword) ||
                    r.Remark.Contains(keyword) ||
                    r.SuggestionType.Name.Contains(keyword) ||
                    r.KpiField.field.Contains(keyword) ||
                    r.User.Nickname.Contains(keyword)
                ) ||
                d.SuggestEventType.Name.Contains(keyword) ||
                d.Organization.Name.Contains(keyword)
            );
        }

        var data = await query
            .OrderByDescending(d => d.Date)
            .ToListAsync();

        return data.Select(d => new SuggestDto
        {
            Id = d.Id,
            Date = d.Date,
            organizationId = d.OrganizationId,
            OrganizationName = d.Organization?.Name,
            SuggestEventTypeName = d.SuggestEventType?.Name,
        }).ToList();
    }
    public async Task<SuggestDetailDto?> GetSuggestDetailAsync(int id)
    {
        var main = await _db.SuggestDates
            .Include(d => d.Organization)
            .Include(d => d.SuggestEventType)
            .Include(d => d.SuggestReports)
            .ThenInclude(r => r.SuggestionType)
            .Include(d => d.SuggestReports)
            .ThenInclude(r => r.KpiField)
            .Include(d => d.SuggestReports)
            .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (main == null)
            return null;

        return new SuggestDetailDto
        {
            Id = main.Id,
            Date = main.Date,
            OrganizationId = main.OrganizationId,
            OrganizationName = main.Organization?.Name,
            SuggestEventTypeName = main.SuggestEventType?.Name,
            Reports = main.SuggestReports.Select(r => new SuggestReportDto
            {
                Id = r.Id,
                Committee = r.User?.Nickname,
                Suggestion = r.SuggestionContent,
                SuggestionType = r.SuggestionType?.Name,
                RespDept = r.RespDept,
                ImproveDetails = r.ImproveDetails,
                IsAdopted = r.IsAdopted.ToString(),
                Completed = r.Completed.ToString(),
                DoneYear = r.DoneYear,
                DoneMonth = r.DoneMonth,
                ParallelExec = r.ParallelExec.ToString(),
                ExecPlan = r.ExecPlan,
                Remark = r.Remark,
                Category = r.KpiField?.field,
                Manpower = r.Manpower,
                Budget = r.Budget
            }).ToList()
        };
    }
    
    public async Task<(bool Success, string Message)> ImportSingleSuggestAsync(AddSuggestDto dto)
    {
        try
        {
            var now = tool.GetTaiwanNow();

            // 處理 KpiField
            var fieldInput = dto.Category?.Trim();
            if (string.Equals(fieldInput, "製程安全", StringComparison.OrdinalIgnoreCase))
                fieldInput = "製程安全管理";

            var kpiField = await _db.KpiFields
                .FirstOrDefaultAsync(f => f.field == fieldInput || f.enfield == fieldInput);

            if (kpiField == null)
            {
                kpiField = new KpiField
                {
                    field = fieldInput,
                    enfield = dto.EnCategory,
                    CreatedAt = now,
                    UpdateAt = now
                };
                _db.KpiFields.Add(kpiField);
                await _db.SaveChangesAsync();
            }

            // 委員帳號
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Nickname == dto.Committee);

            if (user == null)
                return (false, $"找不到對應的委員帳戶（{dto.Committee}）");

            // 建議類別
            var suggestType = await _db.SuggestionTypes
                .FirstOrDefaultAsync(x => x.Name == dto.SuggestionType);
            if (suggestType == null)
            {
                suggestType = new SuggestionType { Name = dto.SuggestionType, CreatedAt = now };
                _db.SuggestionTypes.Add(suggestType);
                await _db.SaveChangesAsync();
            }

            // 會議/活動類別
            var suggestEventType = await _db.SuggestEventTypes
                .FirstOrDefaultAsync(x => x.Name == dto.SuggestEventType);
            if (suggestEventType == null)
            {
                suggestEventType = new SuggestEventType { Name = dto.SuggestEventType, CreatedAt = now };
                _db.SuggestEventTypes.Add(suggestEventType);
                await _db.SaveChangesAsync();
            }

            // 取得或建立 SuggestDate（若已有相同組織+日期+建議內容+活動類型，則重用）
            var suggestDate = await _db.SuggestDates.FirstOrDefaultAsync(x =>
                x.Date == dto.Date &&
                x.OrganizationId == dto.OrganizationId &&
                x.SuggestEventTypeId == suggestEventType.Id);

            if (suggestDate == null)
            {
                suggestDate = new SuggestDate
                {
                    Date = dto.Date,
                    OrganizationId = dto.OrganizationId,
                    SuggestEventTypeId = suggestEventType.Id,
                    CreatedAt = now,
                    UpdateAt = now
                };
                _db.SuggestDates.Add(suggestDate);
                await _db.SaveChangesAsync();
            }

            // 建立 SuggestReport
            var report = new SuggestReport
            {
                SuggestDateId = suggestDate.Id,
                SuggestionContent = dto.Suggestion,
                SuggestionTypeId = suggestType.Id,
                IsAdopted = dto.IsAdopted,
                IsAdoptedOther = dto.AdoptedOther,
                RespDept = dto.Department,
                ImproveDetails = dto.ImproveDetail,
                Manpower = dto.Manpower,
                Budget = dto.Budget,
                Completed = dto.IsCompleted,
                CompletedOther = dto.CompletedOther,
                DoneYear = int.TryParse(dto.DoneYear, out var y) ? y : null,
                DoneMonth = int.TryParse(dto.DoneMonth, out var m) ? m : null,
                ParallelExec = dto.IsParallel,
                ParallelExecOther = dto.ParallelOther,
                ExecPlan = dto.ExecPlan,
                Remark = dto.Remark,
                KpiFieldId = kpiField.Id,
                UserId = user.Id,
                CreatedAt = now,
                UpdateAt = now
            };

            _db.SuggestReports.Add(report);
            await _db.SaveChangesAsync();

            return (true, "✅ 匯入成功");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "匯入建議資料失敗");
            return (false, "❌ 匯入失敗：" + ex.Message);
        }
    }
    
    public async Task<List<SuggestmanyRow>> ParseExcelAsync(Stream fileStream, int organizationId)
    {
        var workbook = new XSSFWorkbook(fileStream);
        var sheet = workbook.GetSheetAt(0); // 第一個工作表
        var result = new List<SuggestmanyRow>();

        // 🏷 依照傳入的 organizationId 查出資料庫中的名稱
        var organization = await _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync();
        
        // 從第2行（index = 1）開始讀，因為第1行是標題
        for (int rowIndex = 1; rowIndex <= sheet.LastRowNum; rowIndex++)
        {
            var row = sheet.GetRow(rowIndex);
            if (row == null) continue;

            var dto = new SuggestmanyRow
            {
                OrganizationId = organizationId,     // ✅ 固定用傳入的 ID
                Organization = organization,         // ✅ 用資料庫查出名稱
                Date = GetCellDate(row.GetCell(0)) ?? DateTime.Now,
                SuggestEventType = GetCellString(row.GetCell(1)),
                FieldName = GetCellString(row.GetCell(2)),
                UserName = GetCellString(row.GetCell(3)),
                SuggestionContent = GetCellString(row.GetCell(4)),
                SuggestionType = GetCellString(row.GetCell(5)),
                RespDept = GetCellString(row.GetCell(6)),
                IsAdoptedName = GetCellString(row.GetCell(7)),
                ImproveDetails = GetCellString(row.GetCell(8)),
                Manpower = (int?)GetCellDecimal(row.GetCell(9)),
                Budget = GetCellDecimal(row.GetCell(10)),
                CompletedName = GetCellString(row.GetCell(11)),
                DoneYear = (int?)GetCellDecimal(row.GetCell(12)),
                DoneMonth = (int?)GetCellDecimal(row.GetCell(13)),
                ParallelExecName = GetCellString(row.GetCell(14)),
                ExecPlan = GetCellString(row.GetCell(15)),
                Remark = GetCellString(row.GetCell(16)),
            };

            result.Add(dto);
        }

        return result;
    }
    
    public async Task<(bool Success, string Message)> BatchInsertSuggestAsync(int organizationId, List<SuggestmanyRow> rows)
    {
        if (rows == null || rows.Count == 0)
            return (false, "無資料可匯入");

        using var transaction = await _db.Database.BeginTransactionAsync();
        var now = tool.GetTaiwanNow();
        int successCount = 0, failCount = 0;
        // 預先查出所有 SuggestionContent 以加速比對（避免逐筆查 DB）
        var existingContents = await _db.SuggestReports
            .Select(x => x.SuggestionContent)
            .ToListAsync();
        var existingSet = new HashSet<string>(existingContents);
        var errorLogs = new List<string>();

        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            
            if (!int.TryParse(row.OrganizationId.ToString(), out _))
                continue;
            try
            {
                var fieldName = row.FieldName?.Trim();
                if (string.IsNullOrWhiteSpace(fieldName))
                {
                    failCount++;
                    errorLogs.Add($"[第{i + 1}筆] 欄位領域為空，跳過");
                    continue;
                }

                string? matchedField = fieldName switch
                {
                    var f when f.StartsWith("製程安全") => "製程安全管理",
                    var f when f.StartsWith("消防") => "消防管理",
                    var f when f.StartsWith("環保") => "環保管理",
                    var f when f.StartsWith("能源") => "能源管理",
                    _ => fieldName
                };

                var kpiField = await _db.KpiFields
                    .FirstOrDefaultAsync(f => f.field == matchedField || f.enfield == matchedField);

                if (kpiField == null)
                {
                    failCount++;
                    errorLogs.Add($"[第{i + 1}筆] 找不到 KpiField：{matchedField}");
                    continue;
                }

                var rawNickname = row.UserName?.Trim();
                if (string.IsNullOrWhiteSpace(rawNickname))
                {
                    failCount++;
                    errorLogs.Add($"[第{i + 1}筆] 委員姓名為空，跳過");
                    continue;
                }

                var user = await _db.Users.FirstOrDefaultAsync(u => u.Nickname == rawNickname);
                if (user == null)
                {
                    string username;
                    do
                    {
                        var suffix = Guid.NewGuid().ToString("N").Substring(0, 6);
                        username = $"member_{suffix}";
                    }
                    while (await _db.Users.AnyAsync(u => u.Username == username));

                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Username = username,
                        Nickname = rawNickname.Length > 50 ? rawNickname.Substring(0, 50) : rawNickname,
                        Email = username + "@autogen.local",
                        OrganizationId = 1218,
                        EmailVerified = false,
                        CreatedAt = now,
                        UpdatedAt = now
                    };

                    try
                    {
                        _db.Users.Add(user);
                        await _db.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        failCount++;
                        errorLogs.Add($"新增使用者失敗（{rawNickname}）：{ex.Message}");
                        continue;
                    }
                }
                
                var suggestionContent = row.SuggestionContent?.Trim();
                if (string.IsNullOrWhiteSpace(suggestionContent))
                {
                    failCount++;
                    errorLogs.Add($"[第{i + 1}筆] 建議內容為空");
                    continue;
                }

                if (existingSet.Contains(suggestionContent))
                {
                    Console.WriteLine($"⚠️ 重複資料已存在，跳過內容：{suggestionContent.Substring(0, Math.Min(20, suggestionContent.Length))}...");
                    failCount++;
                    errorLogs.Add($"[第{i + 1}筆] 已有資料（重複內容）：{suggestionContent.Substring(0, Math.Min(20, suggestionContent.Length))}...");
                    continue;
                }
                
                var suggestionTypeName = row.SuggestionType?.Trim();
                SuggestionType suggestType = null;
                if (!string.IsNullOrWhiteSpace(suggestionTypeName))
                {
                    suggestType = await _db.SuggestionTypes.FirstOrDefaultAsync(x => x.Name == suggestionTypeName);
                    if (suggestType == null)
                    {
                        suggestType = new SuggestionType
                        {
                            Name = suggestionTypeName,
                            CreatedAt = now
                        };
                        _db.SuggestionTypes.Add(suggestType);
                        await _db.SaveChangesAsync();
                    }
                }

                var eventTypeName = row.SuggestEventType?.Trim();
                SuggestEventType suggestEventType = null;
                if (!string.IsNullOrWhiteSpace(eventTypeName))
                {
                    suggestEventType = await _db.SuggestEventTypes.FirstOrDefaultAsync(x => x.Name == eventTypeName);
                    if (suggestEventType == null)
                    {
                        suggestEventType = new SuggestEventType
                        {
                            Name = eventTypeName,
                            CreatedAt = now
                        };
                        _db.SuggestEventTypes.Add(suggestEventType);
                        await _db.SaveChangesAsync();
                    }
                }

                // 嘗試找出是否已有相同 SuggestDate
                var suggestDate = await _db.SuggestDates.FirstOrDefaultAsync(x =>
                    x.Date == row.Date &&
                    x.OrganizationId == row.OrganizationId &&
                    x.SuggestEventTypeId == suggestEventType.Id);

                if (suggestDate == null)
                {
                    suggestDate = new SuggestDate
                    {
                        OrganizationId = row.OrganizationId,
                        Date = row.Date,
                        SuggestEventTypeId = suggestEventType.Id,
                        CreatedAt = now,
                        UpdateAt = now
                    };
                    _db.SuggestDates.Add(suggestDate);
                    await _db.SaveChangesAsync();
                }

                // 建立 SuggestReport
                var newReport = new SuggestReport
                {
                    SuggestDateId = suggestDate.Id,
                    SuggestionTypeId = suggestType.Id,
                    KpiFieldId = kpiField.Id,
                    UserId = user.Id,
                    SuggestionContent = row.SuggestionContent,
                    RespDept = row.RespDept,
                    IsAdopted = ParseIsAdopted(row.IsAdoptedName),
                    ImproveDetails = row.ImproveDetails,
                    Manpower = row.Manpower,
                    Budget = row.Budget,
                    Completed = ParseIsAdopted(row.CompletedName),
                    DoneYear = row.DoneYear,
                    DoneMonth = row.DoneMonth,
                    ParallelExec = ParseIsAdopted(row.ParallelExecName),
                    ExecPlan = row.ExecPlan,
                    Remark = row.Remark,
                    CreatedAt = now,
                    UpdateAt = now
                };

                _db.SuggestReports.Add(newReport);
                successCount++;
            }
            catch (Exception ex)
            {
                failCount++;
                errorLogs.Add($"[第{i + 1}筆] 匯入失敗：{ex.Message}");
            }
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        if (errorLogs.Count > 0)
        {
            var logFileName = $"Suggest失敗匯入紀錄_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            var fullPath = Path.Combine("Logs", logFileName);
            Directory.CreateDirectory("Logs");
            await File.WriteAllLinesAsync(fullPath, errorLogs);
        }

        var summary = $"✅ 匯入完成，成功：{successCount} 筆，失敗：{failCount} 筆";
        if (errorLogs.Count > 0)
        {
            summary += $"\n詳細錯誤如下：\n{string.Join("\n", errorLogs.Take(5))}...";
            summary += "\n👉 其餘詳見 log 檔案";
        }

        return (true, summary);
    }
    
    public async Task<(string FileName, byte[] Content)> GenerateTemplateAsync(int organizationId)
    {
        var workbook = new XSSFWorkbook();

        // ── 工作表1：說明 ──
        var infoSheet = workbook.CreateSheet("說明");
        var titleStyle = workbook.CreateCellStyle();
        var titleFont = workbook.CreateFont();
        titleFont.IsBold = true;
        titleFont.FontHeightInPoints = 14;
        titleStyle.SetFont(titleFont);

        var noteFont = workbook.CreateFont();
        noteFont.FontHeightInPoints = 12;
        var noteStyle = workbook.CreateCellStyle();
        noteStyle.SetFont(noteFont);

        var titleRow = infoSheet.CreateRow(0);
        var titleCell = titleRow.CreateCell(0);
        titleCell.SetCellValue("填寫注意事項");
        titleCell.CellStyle = titleStyle;

        var notes = new[]
        {
            "請勿更動模板中的欄位名稱與順序",
            "僅可填寫／修改藍色欄位，即是否參採、改善對策/辦理情形、預估人力投入、預估經費投入、是否完成改善/辦理、預估完成年份、預估完成月份、平行展開、展開計畫、備註",
            "請確認填寫內容後送出，避免匯入失敗"
        };
        for (int n = 0; n < notes.Length; n++)
        {
            var noteRow = infoSheet.CreateRow(n + 2);
            var noteCell = noteRow.CreateCell(0);
            noteCell.SetCellValue($"• {notes[n]}");
            noteCell.CellStyle = noteStyle;
        }
        infoSheet.SetColumnWidth(0, 120 * 256);

        // ── 工作表2：建議範本 ──
        var sheet = workbook.CreateSheet("Suggest");

        // 可編輯欄位藍底樣式（欄位索引 7~16）
        var blueStyle = workbook.CreateCellStyle();
        var lightBlue = new XSSFColor(new byte[] { 221, 235, 247 });

        ((XSSFCellStyle)blueStyle).SetFillForegroundColor(lightBlue);
        blueStyle.FillPattern = FillPattern.SolidForeground;

        // 標題列
        var headers = new[]
        {
            "單位", "日期", "會議/活動", "類別", "委員", "建議內容",
            "負責單位", "是否參採", "改善對策/辦理情形", "預估人力投入", "預估經費投入", "是否完成改善/辦理",
            "預估完成年份", "預估完成月份", "平行展開", "展開計畫", "備註"
        };
        var headerRow = sheet.CreateRow(0);
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = headerRow.CreateCell(i);
            cell.SetCellValue(headers[i]);
            if (i >= 7)
                cell.CellStyle = blueStyle;
        }

        var reports = await _db.SuggestReports
            .Include(r => r.SuggestDate)
            .ThenInclude(d => d.Organization) // ✅ 單位
            .Include(r => r.User)                // ✅ 委員
            .Include(r => r.SuggestionType)
            .Include(r => r.SuggestDate.SuggestEventType)
            .Where(r => r.SuggestDate.OrganizationId == organizationId)
            .ToListAsync();

        // 「否」（未完成）排最前，方便使用者確認待辦項目
        reports = reports
            .OrderBy(r => r.Completed == IsAdopted.否 ? 0 : r.Completed == null ? 1 : 2)
            .ThenByDescending(r => r.SuggestDate.Date)
            .ToList();

        for (int i = 0; i < reports.Count; i++)
        {
            var r = reports[i];
            var row = sheet.CreateRow(i + 1);

            row.CreateCell(0).SetCellValue(r.SuggestDate.Organization?.Name ?? "");                    // 單位
            row.CreateCell(1).SetCellValue(r.SuggestDate.Date.ToString("yyyy-MM-dd"));                // 日期
            row.CreateCell(2).SetCellValue(r.SuggestDate.SuggestEventType?.Name ?? "");               // 會議/活動
            row.CreateCell(3).SetCellValue(r.SuggestionType?.Name ?? "");                             // 類別
            row.CreateCell(4).SetCellValue(r.User?.Nickname ?? "");                                   // 委員
            row.CreateCell(5).SetCellValue(r.SuggestionContent ?? "");                                // 建議內容
            row.CreateCell(6).SetCellValue(r.RespDept ?? "");                                          // 負責單位

            // 可編輯欄位（藍底）
            var c7  = row.CreateCell(7);  c7.SetCellValue(r.IsAdopted?.ToString() ?? "");   c7.CellStyle  = blueStyle; // 是否參採
            var c8  = row.CreateCell(8);  c8.SetCellValue(r.ImproveDetails ?? "");           c8.CellStyle  = blueStyle; // 改善對策/辦理情形
            var c9  = row.CreateCell(9);  c9.SetCellValue(r.Manpower?.ToString() ?? "");     c9.CellStyle  = blueStyle; // 預估人力投入
            var c10 = row.CreateCell(10); c10.SetCellValue(r.Budget?.ToString() ?? "");      c10.CellStyle = blueStyle; // 預估經費投入
            var c11 = row.CreateCell(11); c11.SetCellValue(r.Completed?.ToString() ?? "");   c11.CellStyle = blueStyle; // 是否完成改善/辦理
            var c12 = row.CreateCell(12); c12.SetCellValue(r.DoneYear?.ToString() ?? "");    c12.CellStyle = blueStyle; // 預估完成年份
            var c13 = row.CreateCell(13); c13.SetCellValue(r.DoneMonth?.ToString() ?? "");   c13.CellStyle = blueStyle; // 預估完成月份
            var c14 = row.CreateCell(14); c14.SetCellValue(r.ParallelExec?.ToString() ?? ""); c14.CellStyle = blueStyle; // 平行展開
            var c15 = row.CreateCell(15); c15.SetCellValue(r.ExecPlan ?? "");                c15.CellStyle = blueStyle; // 展開計畫
            var c16 = row.CreateCell(16); c16.SetCellValue(r.Remark ?? "");                  c16.CellStyle = blueStyle; // 備註
        }

        using var stream = new MemoryStream();
        workbook.Write(stream);
        var fileName = $"Suggest_Template_{DateTime.Now:yyyyMMdd}.xlsx";
        return (fileName, stream.ToArray());
    }
    
    public async Task<List<object>> PreviewAsync(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        var workbook = new XSSFWorkbook(stream);
        var sheet = workbook.GetSheet("Suggest") ?? workbook.GetSheetAt(1);

        var result = new List<object>();

        for (int i = 1; i <= sheet.LastRowNum; i++)
        {
            var row = sheet.GetRow(i);
            if (row == null) continue;

            result.Add(new
            {
                OrgName         = row.GetCell(0)?.ToString(),  // 廠商
                Date            = row.GetCell(1)?.ToString(),  // 日期
                EventType       = row.GetCell(2)?.ToString(),  // 會議/活動
                SuggestType     = row.GetCell(3)?.ToString(),  // 類別
                UserName        = row.GetCell(4)?.ToString(),  // 委員
                Content         = row.GetCell(5)?.ToString(),  // 建議內容
                RespDept        = row.GetCell(6)?.ToString(),  // 負責單位
                IsAdopted       = row.GetCell(7)?.ToString(),  // 是否採納
                ImproveDetails  = row.GetCell(8)?.ToString(),  // 改善對策/辦理情形
                Manpower        = row.GetCell(9)?.ToString(),  // 預估人力投入
                Budget          = row.GetCell(10)?.ToString(), // 預估經費投入
                Completed       = row.GetCell(11)?.ToString(), // 是否完成改善/辦理
                DoneYear        = row.GetCell(12)?.ToString(), // 預估完成年份
                DoneMonth       = row.GetCell(13)?.ToString(), // 預估完成月份
                ParallelExec    = row.GetCell(14)?.ToString(), // 平行展開
                ExecPlan        = row.GetCell(15)?.ToString(), // 展開計畫
                Remark          = row.GetCell(16)?.ToString()  // 備註
            });
        }

        return result;
    }

    public async Task<(bool Success, string Message)> ImportAsync(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var workbook = new XSSFWorkbook(stream);
            var sheet = workbook.GetSheet("Suggest") ?? workbook.GetSheetAt(1);

            for (int i = 1; i <= sheet.LastRowNum; i++)
            {
                var row = sheet.GetRow(i);
                if (row == null) continue;

                // === 1. 擷取 Excel 欄位資料 ===
                var orgName = row.GetCell(0)?.ToString()?.Trim();
                var dateStr = row.GetCell(1)?.ToString()?.Trim();
                var eventTypeName = row.GetCell(2)?.ToString()?.Trim();
                var suggestTypeName = row.GetCell(3)?.ToString()?.Trim();
                var committeeName = row.GetCell(4)?.ToString()?.Trim();
                var suggestionContent = row.GetCell(5)?.ToString()?.Trim();

                var respDept = row.GetCell(6)?.ToString()?.Trim();
                var isAdoptedText = row.GetCell(7)?.ToString()?.Trim();
                var improveDetails = row.GetCell(8)?.ToString()?.Trim();
                var manpowerText = row.GetCell(9)?.ToString()?.Trim();
                var budgetText = row.GetCell(10)?.ToString()?.Trim();
                var completedText = row.GetCell(11)?.ToString()?.Trim();
                var doneYearText = row.GetCell(12)?.ToString()?.Trim();
                var doneMonthText = row.GetCell(13)?.ToString()?.Trim();
                var parallelText = row.GetCell(14)?.ToString()?.Trim();
                var execPlan = row.GetCell(15)?.ToString()?.Trim();
                var remark = row.GetCell(16)?.ToString()?.Trim();

                // === 2. 尋找基礎資料（不可自動建立） ===
                var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Name == orgName);
                if (org == null) continue;

                if (!DateTime.TryParse(dateStr, out var parsedDate)) continue;

                var eventType = await _db.SuggestEventTypes.FirstOrDefaultAsync(x => x.Name == eventTypeName);
                if (eventType == null) continue;

                var suggestionType = await _db.SuggestionTypes.FirstOrDefaultAsync(x => x.Name == suggestTypeName);
                if (suggestionType == null) continue;

                var user = await _db.Users.FirstOrDefaultAsync(u => u.Nickname == committeeName);
                if (user == null) continue;

                // === 3. 取得既有 SuggestDate ===
                var suggestDate = await _db.SuggestDates.FirstOrDefaultAsync(d =>
                    d.Date == parsedDate &&
                    d.OrganizationId == org.Id &&
                    d.SuggestEventTypeId == eventType.Id
                );

                if (suggestDate == null) continue;

                // === 4. 僅更新既有 SuggestReport，不新增 ===
                var existingReport = await _db.SuggestReports.FirstOrDefaultAsync(r =>
                    r.SuggestDateId == suggestDate.Id &&
                    r.UserId == user.Id &&
                    r.SuggestionContent == suggestionContent
                );

                if (existingReport == null) continue;

                existingReport.RespDept       = respDept;
                existingReport.ImproveDetails = improveDetails;
                existingReport.Remark         = remark;
                existingReport.ExecPlan       = execPlan;

                existingReport.IsAdopted      = ParseEnum<IsAdopted>(isAdoptedText);
                existingReport.Completed      = ParseEnum<IsAdopted>(completedText);
                existingReport.ParallelExec   = ParseEnum<IsAdopted>(parallelText);

                existingReport.Manpower       = int.TryParse(manpowerText, out var manpowerVal) ? manpowerVal : null;
                existingReport.Budget         = decimal.TryParse(budgetText, out var budgetVal) ? budgetVal : null;
                existingReport.DoneYear       = int.TryParse(doneYearText, out var yearVal) ? yearVal : null;
                existingReport.DoneMonth      = int.TryParse(doneMonthText, out var monthVal) ? monthVal : null;

                existingReport.UpdateAt       = DateTime.Now;
            }

            await _db.SaveChangesAsync();
            return (true, "✅ 匯入成功");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ 匯入建議資料失敗");
            return (false, $"匯入失敗：{ex.Message}");
        }
    }

    // 泛型 Enum 解析（支援 IsAdopted 枚舉）
    private TEnum? ParseEnum<TEnum>(string? input) where TEnum : struct
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        return Enum.TryParse<TEnum>(input.Trim(), out var value) ? value : null;
    }
    
    public async Task<List<object>> GetReportsByOrganizationAsync(int organizationId)
    {
        var reports = await _db.SuggestReports
            .Include(r => r.SuggestDate)
            .ThenInclude(d => d.Organization)
            .Include(r => r.SuggestionType)
            .Include(r => r.User)
            .Include(r => r.SuggestDate.SuggestEventType)
            .Where(r => r.SuggestDate.OrganizationId == organizationId)
            .ToListAsync();

        // 「否」（未完成）排最前，方便使用者確認待辦項目
        reports = reports
            .OrderBy(r => r.Completed == IsAdopted.否 ? 0 : r.Completed == null ? 1 : 2)
            .ThenByDescending(r => r.SuggestDate.Date)
            .ToList();

        var result = reports.Select(r => new
        {
            ID             = r.Id,
            OrgName        = r.SuggestDate.Organization?.Name,
            Date           = r.SuggestDate.Date.ToString("yyyy-MM-dd"),
            EventType      = r.SuggestDate.SuggestEventType?.Name,
            SuggestType    = r.SuggestionType?.Name,
            UserName       = r.User?.Nickname,
            Content        = r.SuggestionContent,
            RespDept       = r.RespDept,
            IsAdopted      = r.IsAdopted?.ToString(),
            ImproveDetails = r.ImproveDetails,
            Manpower       = r.Manpower,
            Budget         = r.Budget,
            Completed      = r.Completed?.ToString(),
            DoneYear       = r.DoneYear,
            DoneMonth      = r.DoneMonth,
            ParallelExec   = r.ParallelExec?.ToString(),
            ExecPlan       = r.ExecPlan,
            Remark         = r.Remark
        }).ToList<object>();

        return result;
    }
    
    public async Task<bool> UpdateSuggestReportsAsync(List<SuggestDto> reports)
    {
        if (reports == null || !reports.Any()) return false;

        foreach (var dto in reports)
        {
            var report = await _db.SuggestReports.FindAsync(dto.Id);
            if (report == null) continue;

            report.RespDept = dto.RespDept;
            report.IsAdopted = ParseEnum<IsAdopted>(dto.IsAdopted);
            report.ImproveDetails = dto.ImproveDetails;
            report.Manpower = dto.Manpower;
            report.Budget = dto.Budget;
            report.Completed = ParseEnum<IsAdopted>(dto.Completed);
            report.DoneYear = dto.DoneYear;
            report.DoneMonth = dto.DoneMonth;
            report.ParallelExec = ParseEnum<IsAdopted>(dto.ParallelExec);
            report.ExecPlan = dto.ExecPlan;
            report.Remark = dto.Remark;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string Message)> UpdateSuggestDateOrganizationAsync(int suggestDateId, int newOrganizationId)
    {
        var suggestDate = await _db.SuggestDates.FindAsync(suggestDateId);
        if (suggestDate == null)
            return (false, "找不到指定的建議日期資料");

        var orgExists = await _db.Organizations.AnyAsync(o => o.Id == newOrganizationId);
        if (!orgExists)
            return (false, "找不到指定的組織");

        suggestDate.OrganizationId = newOrganizationId;
        await _db.SaveChangesAsync();
        return (true, "所屬廠商已更新");
    }

    public async Task<(bool Success, string Message)> FixReportsOrganizationAsync(List<int> reportIds, int newOrganizationId)
    {
        if (reportIds == null || reportIds.Count == 0)
            return (false, "請至少選擇一筆建議");

        var orgExists = await _db.Organizations.AnyAsync(o => o.Id == newOrganizationId);
        if (!orgExists)
            return (false, "找不到指定的組織");

        var reports = await _db.SuggestReports
            .Include(r => r.SuggestDate)
            .Where(r => reportIds.Contains(r.Id))
            .ToListAsync();

        if (reports.Count == 0)
            return (false, "找不到指定的建議資料");

        // 依 (Date, SuggestEventTypeId) 分組，找或建目標 SuggestDate
        var dateGroupKeys = reports
            .Select(r => (r.SuggestDate.Date, r.SuggestDate.SuggestEventTypeId))
            .Distinct()
            .ToList();

        var targetDateCache = new Dictionary<(DateTime, int), int>();

        foreach (var (date, eventTypeId) in dateGroupKeys)
        {
            var existing = await _db.SuggestDates.FirstOrDefaultAsync(d =>
                d.Date == date &&
                d.SuggestEventTypeId == eventTypeId &&
                d.OrganizationId == newOrganizationId);

            if (existing != null)
            {
                targetDateCache[(date, eventTypeId)] = existing.Id;
            }
            else
            {
                var newDate = new SuggestDate
                {
                    Date = date,
                    SuggestEventTypeId = eventTypeId,
                    OrganizationId = newOrganizationId,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.SuggestDates.Add(newDate);
                await _db.SaveChangesAsync();
                targetDateCache[(date, eventTypeId)] = newDate.Id;
            }
        }

        foreach (var report in reports)
        {
            report.SuggestDateId = targetDateCache[(report.SuggestDate.Date, report.SuggestDate.SuggestEventTypeId)];
        }

        await _db.SaveChangesAsync();
        return (true, $"已成功更新 {reports.Count} 筆建議的所屬廠商");
    }

    public async Task<byte[]> GenerateSuggestReportPdfAsync(int organizationId)
    {
        // 1. 查詢組織名稱
        var orgName = await _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync() ?? organizationId.ToString();

        // 2. 查詢該組織的所有委員建議報告
        var reports = await _db.SuggestReports
            .Include(r => r.SuggestDate)
                .ThenInclude(d => d.Organization)
            .Include(r => r.SuggestionType)
            .Include(r => r.User)
            .Include(r => r.SuggestDate.SuggestEventType)
            .Where(r => r.SuggestDate.OrganizationId == organizationId)
            .ToListAsync();

        // 「否」（未完成）排最前，方便查閱待辦項目
        reports = reports
            .OrderBy(r => r.Completed == IsAdopted.否 ? 0 : r.Completed == null ? 1 : 2)
            .ThenByDescending(r => r.SuggestDate.Date)
            .ToList();

        if (!reports.Any()) return Array.Empty<byte>();

        var generatedAt = tool.GetTaiwanNow();

        // 3. 建立 PDF（QuestPDF，橫向 A4）
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(18, Unit.Point);
                page.DefaultTextStyle(x => x.FontFamily("KaiU").FontSize(8));

                page.Content().Column(col =>
                {
                    // 標題
                    col.Item()
                        .Text($"{orgName}　委員建議報告執行彙整")
                        .FontSize(14).Bold();

                    col.Item().PaddingTop(4);
                    col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
                    col.Item().PaddingTop(4);

                    // 表格
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(50);   // 日期
                            cols.ConstantColumn(52);   // 會議/活動
                            cols.ConstantColumn(40);   // 類別
                            cols.ConstantColumn(36);   // 委員
                            cols.RelativeColumn(3);    // 建議內容
                            cols.ConstantColumn(46);   // 負責單位
                            cols.ConstantColumn(40);   // 是否參採
                            cols.RelativeColumn(3);    // 改善對策
                            cols.ConstantColumn(36);   // 是否完成
                            cols.RelativeColumn(2);    // 備註
                        });

                        // 表頭
                        table.Header(header =>
                        {
                            string[] headers =
                            {
                                "日期", "會議/活動", "類別", "委員",
                                "建議內容", "負責單位", "是否參採", "改善對策",
                                "是否完成", "備註"
                            };
                            foreach (var h in headers)
                            {
                                header.Cell()
                                    .Background(Colors.Grey.Lighten2)
                                    .Border(0.5f).BorderColor(Colors.Grey.Medium)
                                    .Padding(2)
                                    .Text(h).Bold().FontSize(8);
                            }
                        });

                        // 資料列
                        bool alt = false;
                        foreach (var r in reports)
                        {
                            var bgColor = alt ? Colors.Blue.Lighten5 : Colors.White;
                            alt = !alt;

                            string[] cells =
                            {
                                r.SuggestDate.Date.ToString("yyyy-MM-dd"),
                                r.SuggestDate.SuggestEventType?.Name ?? "",
                                r.SuggestionType?.Name ?? "",
                                r.User?.Nickname ?? "",
                                r.SuggestionContent ?? "",
                                r.RespDept ?? "",
                                r.IsAdopted?.ToString() ?? "",
                                r.ImproveDetails ?? "",
                                r.Completed?.ToString() ?? "",
                                r.Remark ?? ""
                            };

                            foreach (var cell in cells)
                            {
                                table.Cell()
                                    .Background(bgColor)
                                    .Border(0.3f).BorderColor(Colors.Grey.Lighten2)
                                    .Padding(2)
                                    .Text(cell).FontSize(7);
                            }
                        }
                    });
                });

                // 頁尾
                page.Footer().Row(row =>
                {
                    row.RelativeItem()
                        .Text($"經濟部產業園區管理局績效指標資料庫 - 資料產製時間：{generatedAt:yyyy/MM/dd HH:mm}　共 {reports.Count} 筆")
                        .FontSize(7).FontColor(Colors.Grey.Medium);
                    row.ConstantItem(60).AlignRight().Text(text =>
                    {
                        text.Span("第 ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                        text.Span(" 頁");
                    });
                });
            });
        });

        return document.GeneratePdf();
    }

    public async Task<SuggestSubmissionStatus?> CheckSubmissionStatusAsync(int organizationId, int year, string period)
    {
        // 取最新一筆事件的 status（append-only，多筆記錄）
        var latest = await _db.SuggestSubmissions
            .Where(s => s.OrganizationId == organizationId && s.Year == year && s.Period == period)
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
        return latest?.Status;
    }

    public async Task<(bool Success, string Message)> RecordSubmissionAsync(
        int organizationId, int year, string period, Guid? userId, string? userName)
    {
        // 每次送出都新增一筆，保留完整時間軸供歷程查詢
        _db.SuggestSubmissions.Add(new SuggestSubmission
        {
            OrganizationId      = organizationId,
            Year                = year,
            Period              = period,
            Status              = SuggestSubmissionStatus.Submitted,
            SubmittedAt         = tool.GetTaiwanNow(),
            SubmittedByUserId   = userId,
            SubmittedByUserName = userName,
        });

        await _db.SaveChangesAsync();
        return (true, "填報狀態已記錄");
    }

    public async Task<(bool Success, string Message)> SelfReturnSuggestAsync(int organizationId, int year, string period)
    {
        var hasRecord = await _db.SuggestSubmissions
            .AnyAsync(s => s.OrganizationId == organizationId && s.Year == year && s.Period == period);

        if (!hasRecord)
            return (false, "找不到對應的填報紀錄");

        // 退回也新增一筆 Returned 事件，不修改舊記錄
        _db.SuggestSubmissions.Add(new SuggestSubmission
        {
            OrganizationId = organizationId,
            Year           = year,
            Period         = period,
            Status         = SuggestSubmissionStatus.Returned,
            SubmittedAt    = tool.GetTaiwanNow(),
        });
        await _db.SaveChangesAsync();
        return (true, "已退回，可重新填寫");
    }
}