namespace WebAPI1.Services;

/// <summary>
/// 定時輪詢退信監控信箱的背景服務。設定裡 Enabled=false（appsettings.json 預設值）
/// 時整個迴圈只會睡眠、不會真的連線，避免在還沒確認 IMAP 能不能連線之前就一直嘗試。
/// </summary>
public class BounceProcessingBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BounceProcessingBackgroundService> _logger;

    public BounceProcessingBackgroundService(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<BounceProcessingBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("退信處理背景服務已啟動");

        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var settings = BounceMailSettings.FromConfiguration(_configuration);
            var intervalMinutes = Math.Max(1, settings.CheckIntervalMinutes);

            try
            {
                if (settings.Enabled)
                {
                    _logger.LogDebug("開始處理退信...");

                    using var scope = _serviceProvider.CreateScope();
                    var bounceService = scope.ServiceProvider.GetRequiredService<BounceProcessingService>();
                    var result = await bounceService.ProcessBouncesAsync(settings, stoppingToken);

                    if (!result.Success)
                    {
                        _logger.LogWarning("退信處理發生錯誤: {Error}", result.Error);
                    }
                }
                else
                {
                    _logger.LogDebug("退信處理未啟用，跳過");
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "退信處理背景服務發生例外");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("退信處理背景服務已停止");
    }
}
