using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class TestController: ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly ITestService _testService;
    
    public TestController(ISHAuditDbcontext db, ITestService testService)
    {
        _db = db;
        _testService = testService;
    }

    
    // 系統管理員上傳Excel並預覽前五筆
    [HttpPost("full-import-preview-111and112")]
    public async Task<IActionResult> ParseFullImportExcel([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("請上傳檔案。");

        var previewData = _testService.ParseFullImportExcel(file.OpenReadStream());
        return Ok(previewData);
    }
    
    /// <summary>
    /// 系統管理員批次匯入KPI資料
    /// </summary>
    [HttpPost("full-import-confirm-111and112")]
    public async Task<IActionResult> BatchFullKpiDataAsync([FromBody] List<KpiimportexcelDto> rows)
    {
        if (rows == null || rows.Count == 0)
        {
            return BadRequest("匯入資料為空！");
        }

        var (success, message) = await _testService.BatchFullKpiDataAsync(rows);

        if (success)
        {
            return Ok(new
            {
                success = true,
                message
            });
        }
        else
        {
            return BadRequest(new
            {
                success = false,
                message
            });
        }
    }
}