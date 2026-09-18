using Microsoft.AspNetCore.Mvc;

namespace WebAPI1.Controllers;

[ApiController]
[Route("[controller]")]
public class VerifyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<VerifyController> _logger;

    public VerifyController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<VerifyController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public class VerifyRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] VerifyRequest request)
    {
        var secretKey = _configuration["Turnstile:SecretKey"];
        if (string.IsNullOrEmpty(secretKey))
        {
            _logger.LogError("Turnstile SecretKey 未設定");
            return StatusCode(500, new { success = false, message = "伺服器設定錯誤" });
        }

        var client = _httpClientFactory.CreateClient();
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = secretKey,
            ["response"] = request.Token
        });

        var response = await client.PostAsync(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify", content);

        var json = await response.Content.ReadAsStringAsync();
        var result = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json);

        var success = result.TryGetProperty("success", out var successProp) && successProp.GetBoolean();

        return success
            ? Content(json, "application/json")
            : BadRequest(System.Text.Json.JsonSerializer.Deserialize<object>(json));
    }
}
