using Microsoft.AspNetCore.Mvc;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[ApiController]
[Route("[controller]")]
public class ContactController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ILogger<ContactController> _logger;

    public ContactController(IEmailService emailService, ILogger<ContactController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    public class ContactRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Organization { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public string? CaptchaToken { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ContactRequest request)
    {
        // 表單驗證
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Organization) ||
            string.IsNullOrWhiteSpace(request.Subject) ||
            string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { success = false, message = "所有必填欄位都必須填寫" });
        }

        // Email 格式驗證
        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
        {
            return BadRequest(new { success = false, message = "請提供有效的電子郵件地址" });
        }

        var categoryMap = new Dictionary<string, string>
        {
            ["general"] = "一般詢問",
            ["technical"] = "技術支援",
            ["account"] = "帳號問題",
            ["report"] = "報告相關",
            ["tracking"] = "問題追蹤相關",
            ["suggestion"] = "建議與回饋"
        };

        var categoryText = categoryMap.TryGetValue(request.Category, out var mapped) ? mapped : request.Category;
        var adminEmail = "idsl5397@mail.isha.org.tw";

        var formattedTimestamp = DateTime.TryParse(request.Timestamp, out var ts)
            ? ts.ToString("yyyy/M/d tt hh:mm:ss", new System.Globalization.CultureInfo("zh-TW"))
            : request.Timestamp;

        // 管理員通知信
        var adminHtml = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;"">
    <h2 style=""color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;"">
        績效指標資料庫平台 - 新訊息
    </h2>

    <div style=""margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;"">
        <h3 style=""color: #495057; margin-top: 0;"">聯絡資訊</h3>
        <table style=""width: 100%; border-collapse: collapse;"">
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057; width: 120px;"">姓名：</td>
                <td style=""padding: 8px 0; color: #212529;"">{request.Name}</td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057;"">電子郵件：</td>
                <td style=""padding: 8px 0; color: #212529;"">
                    <a href=""mailto:{request.Email}"" style=""color: #007bff; text-decoration: none;"">{request.Email}</a>
                </td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057;"">單位/組織：</td>
                <td style=""padding: 8px 0; color: #212529;"">{request.Organization}</td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057;"">問題類別：</td>
                <td style=""padding: 8px 0;"">
                    <span style=""background-color: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;"">
                        {categoryText}
                    </span>
                </td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057;"">主旨：</td>
                <td style=""padding: 8px 0; color: #212529;"">{request.Subject}</td>
            </tr>
            <tr>
                <td style=""padding: 8px 0; font-weight: bold; color: #495057;"">提交時間：</td>
                <td style=""padding: 8px 0; color: #6c757d; font-size: 14px;"">
                    {formattedTimestamp}
                </td>
            </tr>
        </table>
    </div>

    <div style=""margin: 20px 0;"">
        <h3 style=""color: #495057; margin-bottom: 10px;"">訊息內容</h3>
        <div style=""background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; white-space: pre-wrap; line-height: 1.5; color: #212529;"">
{request.Message}
        </div>
    </div>

    <div style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;"">
        <p>此郵件由績效指標資料庫平台自動發送</p>
        <p>請勿直接回覆此郵件，如需回覆請直接聯絡 {request.Email}</p>
    </div>
</div>";

        // 使用者確認信
        var confirmHtml = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;"">
    <h2 style=""color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;"">
        感謝您的聯絡
    </h2>

    <p>親愛的 {request.Name}，</p>

    <p>我們已收到您的訊息，感謝您與我們聯絡。</p>

    <div style=""margin: 20px 0; padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;"">
        <h4 style=""margin-top: 0; color: #155724;"">您的訊息摘要：</h4>
        <p><strong>主旨：</strong> {request.Subject}</p>
        <p><strong>類別：</strong> {categoryText}</p>
        <p><strong>提交時間：</strong> {formattedTimestamp}</p>
    </div>

    <p>我們的專業團隊將盡快處理您的請求，並會透過此電子郵件地址回覆您。</p>

    <p>如果您有任何緊急問題，請撥打我們的服務專線：<strong>(07) 550-3115</strong></p>

    <div style=""margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;"">
        <p>此為系統自動發送的確認郵件，請勿直接回覆。</p>
        <p style=""margin: 0;"">
            <strong>中華民國工業安全衛生協會-高雄安環技術處</strong><br>
            地址：高雄市左營區博愛三路12號15樓<br>
            電話：(07) 550-3115
        </p>
    </div>
</div>";

        try
        {
            // 寄送管理員通知信
            await _emailService.SendEmailAsync(new EmailOption
            {
                To = adminEmail,
                Subject = $"[{categoryText}] {request.Subject}",
                Body = adminHtml
            });

            // 寄送使用者確認信（失敗不影響主流程）
            try
            {
                await _emailService.SendEmailAsync(new EmailOption
                {
                    To = request.Email,
                    Subject = "感謝您的聯絡 - 績效指標資料庫平台",
                    Body = confirmHtml
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "確認郵件發送失敗");
            }

            return Ok(new { success = true, message = "您的訊息已成功送出，我們將盡快回覆您" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "處理聯絡表單時發生錯誤");
            return StatusCode(500, new
            {
                success = false,
                message = "系統發生錯誤，請稍後再試或直接聯絡我們的服務專線"
            });
        }
    }
}
