using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WebAPI1.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;
using WebAPI1.Context;
using Microsoft.AspNetCore.DataProtection;
using WebAPI1.Mcp;
var options  = new WebApplicationOptions
{
    WebRootPath = "wwwroot"  // 這樣才是正確設定 web root 的方式
};

var builder = WebApplication.CreateBuilder(options);

// 1. 設定 Kestrel 伺服器限制 (預設約 28.6 MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 104857600; // 例如設定 100 MB
    // 若要完全不限制，可設為 null (不建議在正式環境這樣做)
    // options.Limits.MaxRequestBodySize = null;
});

// 2. 設定 Form Options (針對 Multipart/form-data，預設約 128 MB)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; // 設定 100 MB
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = int.MaxValue;
});


var jwtSettings = builder.Configuration.GetSection("JwtSettings");

//redis settings
builder.Services.AddSingleton<IConnectionMultiplexer>(provider =>
{
    var redisConnectionString = builder.Configuration.GetValue<string>("ConnectionStrings:Redis");
    if (string.IsNullOrWhiteSpace(redisConnectionString))
        throw new ArgumentNullException(nameof(redisConnectionString));
    return ConnectionMultiplexer.Connect(redisConnectionString);
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "績效指標資料庫後台", Version = "v1" });

    // ✅ 加入 JWT Bearer 支援
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "請輸入 JWT Token，格式為：Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    // ✅ 全域要求加上 Bearer 權限
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddDbContext<ISHAuditDbcontext>((sp, options) =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("WebDatabase"));
    options.AddInterceptors(sp.GetRequiredService<DataChangeLogInterceptor>()); // ✅ 掛進 EF
});

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(WebAPI1.Common.McpOAuthConstants.AuthenticationScheme, options =>
    {
        // 對外 /mcp 端點專用的第二組 JwtBearer scheme——驗證 McpAuthorizationServerService
        // 核發的 access token（aud=isha-kpi-mcp），跟一般登入用的預設 scheme（aud=一般前端網址）
        // 完全分開，一般登入 token 打不進 /mcp，MCP token 也打不進其他一般 API。
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = jwtSettings.GetValue<bool>("ValidateIssuer"),
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = WebAPI1.Common.McpOAuthConstants.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"])),
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            // RFC 9728：沒帶 token 打 /mcp 時，讓 401 的 WWW-Authenticate header 帶上
            // resource_metadata，外部 MCP client 才能自動探索去哪裡走 OAuth 流程。
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                var issuer = builder.Configuration["PublicBaseUrl"]?.TrimEnd('/')
                    ?? $"{context.Request.Scheme}://{context.Request.Host}";
                context.Response.Headers.Append("WWW-Authenticate",
                    $"Bearer resource_metadata=\"{issuer}/.well-known/oauth-protected-resource\"");
                return Task.CompletedTask;
            }
        };
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = jwtSettings.GetValue<bool>("ValidateIssuer"),
            ValidateAudience = jwtSettings.GetValue<bool>("ValidateAudience"),
            ValidateLifetime = jwtSettings.GetValue<bool>("ValidateLifetime"),
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"])),
            ClockSkew = TimeSpan.Zero // ✅ 建議設為 0，不然有預設 5 分鐘容錯
        };

        // ✅ 加入事件來處理過期 token
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // 若無 Authorization header，改從 cookie 讀取 token
                if (string.IsNullOrEmpty(context.Token))
                {
                    context.Token = context.Request.Cookies["token"];
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                if (context.Exception is SecurityTokenExpiredException)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Fail("Access token 過期");
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Permission:view", policy => policy.RequireClaim("permission", "view"));
    options.AddPolicy("Permission:edit", policy => policy.RequireClaim("permission", "edit"));
    options.AddPolicy("Permission:delete", policy => policy.RequireClaim("permission", "delete"));
    options.AddPolicy("Permission:view-ranking", policy => policy.RequireClaim("permission", "view-ranking"));
    options.AddPolicy("Permission:view-report", policy => policy.RequireClaim("permission", "view-report"));
    options.AddPolicy("Permission:kpi-approve", policy => policy.RequireClaim("permission", "kpi-approve"));
    options.AddPolicy("Permission:setting-audit", policy => policy.RequireClaim("permission", "setting-audit"));
    options.AddPolicy("Permission:agent-admin", policy => policy.RequireClaim("permission", "agent-admin"));
    options.AddPolicy("Permission:agent-use", policy => policy.RequireClaim("permission", "agent-use"));
    // ➕ 依你資料庫還有哪些 Permission.Key 自動加上

    // /mcp 端點專用：限定只接受上面那組 "Mcp" scheme 驗證過的 token，一般登入 token（即使
    // 帶了任何 permission claim）一律不算——兩種 token 的 aud 本來就不同，這裡再擋一次雙重保險。
    options.AddPolicy(WebAPI1.Common.McpOAuthConstants.AuthorizationPolicy, policy =>
        policy.AddAuthenticationSchemes(WebAPI1.Common.McpOAuthConstants.AuthenticationScheme)
              .RequireAuthenticatedUser());
});

builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = null; // 禁用 HTTPS 重定向
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // SetIsOriginAllowed 允許任意來源且可搭配 AllowCredentials（AllowAnyOrigin 不行）
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });

    // /mcp、/oauth/*、/.well-known/* 專用——外部 MCP client（claude.ai 等）不是同一個瀏覽器
    // session，不能靠 cookie 驗證，用不到 AllowCredentials，所以另開一個單純 AllowAnyOrigin
    // 的公開政策，不跟主要的 "AllowAll" 政策混在一起。
    options.AddPolicy("McpPublic", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});


builder.Services.AddControllers();

builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IKpiService, KpiService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISuggestService, SuggestService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IImprovementService, ImprovementService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<BounceProcessingService>();
builder.Services.AddHostedService<BounceProcessingBackgroundService>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("mcp", client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<ITestService, TestService>();
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<DataChangeLogInterceptor>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// AI Agent（文件 RAG）：跟 GeminiController 用的服務完全分開註冊，互不牽動。
// 金鑰要持久化到掛了 volume 的路徑——預設只存在容器內的 /root/.aspnet，容器重建
// 一次金鑰就換一把，之前用它加密存進 DB 的 LiteLLM API Key 會直接解不開。
var agentDocumentsStorageRoot = builder.Configuration["AgentDocuments:StorageRoot"] ?? "agent-documents";
var dataProtectionKeyPath = Path.Combine(agentDocumentsStorageRoot, ".dp-keys");
Directory.CreateDirectory(dataProtectionKeyPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeyPath))
    .SetApplicationName("WebAPI1.AgentController");
builder.Services.AddScoped<IAgentCallerContextService, AgentCallerContextService>();
builder.Services.AddSingleton<IAgentVectorStoreService, AgentVectorStoreService>(); // NpgsqlDataSource 本身是連線池，設計上就該是單例
builder.Services.AddSingleton<IAgentEmbeddingService, AgentEmbeddingService>(); // ONNX 模型載入一次重複用，不要每次請求都重新載入
builder.Services.AddMemoryCache(); // AgentDocumentTools 拿來短 TTL 快取組織清單，避免每次 search_documents 帶公司名稱都整表重撈
builder.Services.AddScoped<AgentDocumentTools>();
builder.Services.AddScoped<AgentDocumentIngestionService>();
// MCP OAuth 連接流程的橋接器（開始連接 → 背景等瀏覽器授權 → callback 路由回呼），純記憶體、
// 短命流程，singleton 就好，不用查資料庫。見 McpOAuthFlowCoordinator 的完整說明。
builder.Services.AddSingleton<IMcpOAuthFlowCoordinator, McpOAuthFlowCoordinator>();

// KPI 對外開放的 /mcp 端點（OAuth 2.1 Authorization Server + MCP server）。
builder.Services.AddScoped<IMcpAuthorizationServerService, McpAuthorizationServerService>();
builder.Services.AddIshaMcpServer();


var redisConnectionString = builder.Configuration.GetValue<string>("ConnectionStrings:Redis");
        
Console.WriteLine($"Redis 連線字串: {redisConnectionString}");
// 添加數據庫服務
var connectionString = builder.Configuration.GetValue<string>("ConnectionStrings:WebDatabase");
Console.WriteLine($"SQL 連線字串: {connectionString}");

var app = builder.Build();

// 啟動時自動套用尚未執行的 migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ISHAuditDbcontext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw(@"
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LoginLogs')
        BEGIN
            CREATE TABLE LoginLogs (
                Id BIGINT IDENTITY(1,1) PRIMARY KEY,
                OccurredAtUtc DATETIME2 NOT NULL,
                UserId NVARCHAR(100) NULL,
                UserEmail NVARCHAR(200) NULL,
                IsSuccess BIT NOT NULL,
                FailReason NVARCHAR(500) NULL,
                ClientIp NVARCHAR(100) NULL
            )
        END");

    // AI Agent 工具目錄種子資料：只在資料庫還沒有這幾筆時才新增，v1 只有唯讀查詢工具，
    // 預設不指派給任何角色（不掛 AgentToolRole）——管理員仍可用（見 AgentController 的
    // IsSuperAdmin 略過角色過濾規則），一般角色要管理員到工具目錄頁手動勾選才會生效。
    var seedTools = new[]
    {
        ("search_documents", "語意搜尋已上傳文件（PDF/Word/Excel）的內容片段"),
        ("query_document_table", "對文件裡的表格資料做精確篩選/加總/平均/計數"),
        ("analyze_image", "重新讀取原始圖片並針對具體問題精確判讀")
    };
    foreach (var (key, description) in seedTools)
    {
        if (!db.AgentTools.Any(t => t.ToolKey == key))
        {
            db.AgentTools.Add(new WebAPI1.Entities.AgentTool
            {
                ToolKey = key,
                Description = description,
                Source = WebAPI1.Entities.AgentToolSource.InProcess,
                RiskTier = WebAPI1.Entities.AgentToolRiskTier.Low,
                IsEnabled = true
            });
        }
    }
    db.SaveChanges();

    // agent-admin 權限種子資料：光靠 Program.cs 上面 AddPolicy("Permission:agent-admin", ...)
    // 這行程式碼，資料庫裡如果沒有對應的 Permission 資料列、也沒有任何角色被授權，這個
    // policy 檢查一律 403——包括真正的管理員也會被擋（實測：這份 PR 只在原開發者本機的
    // DB 手動補過這筆資料，別人拉下這個 PR 到自己環境會直接 403，就是漏了這段種子資料）。
    // 這裡保證「權限本身存在、且 admin/superAdmin 角色預設有」，其餘角色要不要開放
    // 由管理員自己到後台權限管理頁勾選。
    var agentAdminPermission = db.Permissions.FirstOrDefault(p => p.Key == "agent-admin");
    if (agentAdminPermission is null)
    {
        agentAdminPermission = new WebAPI1.Entities.Permission
        {
            Key = "agent-admin",
            Description = "AI Agent 管理"
        };
        db.Permissions.Add(agentAdminPermission);
        db.SaveChanges();
    }
    var agentAdminRoleNames = new[] { "admin", "superAdmin" };
    var rolesToGrantAgentAdmin = db.Roles.Where(r => agentAdminRoleNames.Contains(r.Name)).ToList();
    foreach (var role in rolesToGrantAgentAdmin)
    {
        var alreadyGranted = db.RolePermissions.Any(rp => rp.RoleId == role.Id && rp.PermissionId == agentAdminPermission.Id);
        if (!alreadyGranted)
        {
            db.RolePermissions.Add(new WebAPI1.Entities.RolePermission
            {
                RoleId = role.Id,
                PermissionId = agentAdminPermission.Id
            });
        }
    }
    db.SaveChanges();
}

// app.Urls.Add("http://0.0.0.0:8080");

// QuestPDF 社群授權 + 中文字體（楷書）
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
var kaiuFontPath = Path.Combine(app.Environment.WebRootPath, "fonts", "kaiu.ttf");
if (System.IO.File.Exists(kaiuFontPath))
{
    using var kaiuFontStream = System.IO.File.OpenRead(kaiuFontPath);
    QuestPDF.Drawing.FontManager.RegisterFontWithCustomName("KaiU", kaiuFontStream);
}
else
{
    Console.WriteLine("[Warning] kaiu.ttf 字體檔案不存在，PDF 中文字體將無法使用");
}

// Configure the HTTP request pipeline.
// if (app.Environment.IsDevelopment())
// {
    app.UseSwagger();
    app.UseSwaggerUI();
// }

app.UseRouting();
// app.UseHttpsRedirection();
app.UseAuthentication();  // **⚠️ 確保這行存在**
app.UseAuthorization();


// app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.WebRootPath, "images")),
    RequestPath = "/images"  // 訪問路徑: /images/photo.jpg
});
app.UseCors("AllowAll");


app.MapControllers();
app.MapIshaMcpServer();

app.Run();
