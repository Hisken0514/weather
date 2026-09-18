using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Entities;
using File = WebAPI1.Entities;

namespace WebAPI1.Context;

public partial class ISHAuditDbcontext : DbContext
{
    private readonly IConfiguration _configuration;
    public ISHAuditDbcontext(DbContextOptions<ISHAuditDbcontext> options, IConfiguration configuration)
        : base(options)
    {
        _configuration = configuration;
    }

    public virtual DbSet<UserInfoName> UserInfoNames { get; set; }
    public virtual DbSet<KpiField> KpiFields { get; set; }
    public virtual DbSet<KpiItem> KpiItems { get; set; }
    public virtual DbSet<KpiItemName> KpiItemNames { get; set; }
    public virtual DbSet<KpiDetailItem> KpiDetailItems { get; set; }
    public virtual DbSet<KpiDetailItemName> KpiDetailItemNames { get; set; }
    public virtual DbSet<KpiDetailItemMappingGroup> KpiDetailItemMappingGroups { get; set; }
    public virtual DbSet<KpiDetailItemMapping> KpiDetailItemMappings { get; set; }
    public virtual DbSet<ReportPeriodSetting> ReportPeriodSettings { get; set; }
    public virtual DbSet<KpiData> KpiDatas { get; set; }
    public virtual DbSet<KpiReport> KpiReports { get; set; }
    public virtual DbSet<KpiReportSnapshot> KpiReportSnapshots { get; set; }
    public virtual DbSet<KpiCycle> KpiCycles { get; set; }
    public DbSet<DataChangeLog> DataChangeLogs => Set<DataChangeLog>();
    public DbSet<LoginLog> LoginLogs => Set<LoginLog>();
    public DbSet<MailLog> MailLogs => Set<MailLog>();
    public virtual DbSet<Menu> Menus { get; set; }
    public virtual DbSet<MenuRole> MenusRoles { get; set; }
    public virtual DbSet<Organization> Organizations { get; set; }
    public virtual DbSet<OrganizationType> OrganizationTypes { get; set; }  
    public virtual DbSet<OrganizationDomain> OrganizationDomains { get; set; }
    public virtual DbSet<OrganizationHierarchy> OrganizationHierarchies { get; set; }  
    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<UserRole> UserRoles { get; set; }
    public virtual DbSet<Role> Roles { get; set; }
    public virtual DbSet<Permission> Permissions { get; set; }
    public virtual DbSet<RolePermission> RolePermissions { get; set; }
    public virtual DbSet<UserPasswordHistory> UserRPasswordHistories { get; set; }
    public virtual DbSet<SuggestEventType> SuggestEventTypes { get; set; }
    public virtual DbSet<SuggestionType> SuggestionTypes { get; set; }
    public virtual DbSet<SuggestDate> SuggestDates { get; set; }
    public virtual DbSet<SuggestReport> SuggestReports { get; set; }
    public virtual DbSet<SuggestFile> SuggestFiles { get; set; }
    public virtual DbSet<SuggestSubmission> SuggestSubmissions { get; set; }
    public virtual DbSet<PasswordPolicy> PasswordPolicy { get; set; }
    public virtual DbSet<File.File> Files { get; set; }
    public virtual DbSet<SystemAnnouncement> SystemAnnouncements { get; set; }
    public virtual DbSet<GeminiSetting> GeminiSettings { get; set; }
    public virtual DbSet<AgentLiteLlmSetting> AgentLiteLlmSettings { get; set; }
    public virtual DbSet<AgentMcpEndpoint> AgentMcpEndpoints { get; set; }
    public virtual DbSet<AgentTool> AgentTools { get; set; }
    public virtual DbSet<AgentToolRole> AgentToolRoles { get; set; }
    public virtual DbSet<AgentDocument> AgentDocuments { get; set; }
    public virtual DbSet<AgentConversation> AgentConversations { get; set; }
    public virtual DbSet<AgentConversationMessage> AgentConversationMessages { get; set; }
    public virtual DbSet<AgentPromptSetting> AgentPromptSettings { get; set; }
    public virtual DbSet<McpOAuthClient> McpOAuthClients { get; set; }
    public virtual DbSet<McpAuthorizationCode> McpAuthorizationCodes { get; set; }
    public virtual DbSet<McpRefreshToken> McpRefreshTokens { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _configuration.GetConnectionString("WebDatabase");
            optionsBuilder.UseSqlServer(connectionString);
        }
    }
    
    // protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    // {
    //     if (!optionsBuilder.IsConfigured)
    //     {
    //         // 從 appsettings.json 中取得連接字串
    //         var connectionString = configuration.GetConnectionString("ISHAuditDatabase");
    //         optionsBuilder.UseSqlServer(connectionString);
    //     }
    // }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        OnModelCreatingPartial(modelBuilder);
        modelBuilder.Entity<DataChangeLog>(e =>
        {
            e.ToTable("DataChangeLogs");
            e.HasKey(x => x.Id);
        });
        modelBuilder.Entity<LoginLog>(e =>
        {
            e.ToTable("LoginLogs");
            e.HasKey(x => x.Id);
        });
        modelBuilder.Entity<MailLog>(e =>
        {
            e.ToTable("MailLogs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.MessageId);
            e.HasIndex(x => x.SentAtUtc);
        });
        
        // SuggestEventType 與 SuggestDate 關聯設定
        modelBuilder.Entity<SuggestEventType>()
            .HasMany(e => e.SuggestDates)
            .WithOne(d => d.SuggestEventType)
            .HasForeignKey(d => d.SuggestEventTypeId)
            .OnDelete(DeleteBehavior.NoAction);

        // SuggestionType 與 SuggestReport 關聯設定
        modelBuilder.Entity<SuggestionType>()
            .HasMany(t => t.SuggestReports)
            .WithOne(d => d.SuggestionType)
            .HasForeignKey(d => d.SuggestionTypeId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Organization 與 SuggestDate 關聯設定
        modelBuilder.Entity<SuggestDate>()
            .HasOne(c => c.Organization)
            .WithMany()
            .HasForeignKey(d => d.OrganizationId);
        
        // KpiField 與 SuggestReport 關聯設定
        modelBuilder.Entity<KpiField>()
            .HasMany(c => c.SuggestReports)
            .WithOne(s => s.KpiField)
            .HasForeignKey(s => s.KpiFieldId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // UserInfo 與 SuggestData 關聯設定
        modelBuilder.Entity<User>()
            .HasMany(c => c.SuggestReports)
            .WithOne(s => s.User)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.NoAction);
        
        // Organization 與 SuggestFile 關聯設定
        modelBuilder.Entity<SuggestFile>()
            .HasOne(c => c.Organization)
            .WithMany()
            .HasForeignKey(d => d.OrganizationId);
        
        // Menu 與 MenuRole 關聯設定
        modelBuilder.Entity<Menu>()
            .HasMany(e => e.MenuRoles)
            .WithOne(c => c.Menu)
            .HasForeignKey(c => c.MenuId)
            .OnDelete(DeleteBehavior.NoAction);
        
//--------------------    Organization    --------------------
        // 設定 Organization 與 User 關聯
        // 設定 Organization 與 User 關聯
         modelBuilder.Entity<OrganizationType>()
            .HasKey(ot => ot.Id);

        modelBuilder.Entity<OrganizationType>()
            .HasIndex(ot => ot.TypeCode)
            .IsUnique();

        // 設定 Organization 表
        modelBuilder.Entity<Organization>()
            .HasKey(o => o.Id);

        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.Code)
            .IsUnique();

        // 設定 Organization 與 OrganizationType 關聯
        modelBuilder.Entity<Organization>()
            .HasOne(o => o.OrganizationType)
            .WithMany(ot => ot.Organizations)
            .HasForeignKey(o => o.TypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // 設定 Organization 自關聯 (parent-child)
        modelBuilder.Entity<Organization>()
            .HasOne(o => o.ParentOrganization)
            .WithMany(o => o.ChildOrganizations)
            .HasForeignKey(o => o.ParentId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);
        
        // 與 OrganizationDomain 的一對多關聯
        modelBuilder.Entity<Organization>()
            .HasMany(o => o.Domains)
            .WithOne(d => d.Organization)
            .HasForeignKey(d => d.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        // 設定 OrganizationHierarchy 表
        modelBuilder.Entity<OrganizationHierarchy>()
            .HasKey(oh => oh.Id);


        // 設定 OrganizationHierarchy 與 OrganizationType 關聯 (父類型)
        modelBuilder.Entity<OrganizationHierarchy>()
            .HasOne(oh => oh.ParentType)
            .WithMany(ot => ot.ParentHierarchies)
            .HasForeignKey(oh => oh.ParentTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // 設定 OrganizationHierarchy 與 OrganizationType 關聯 (子類型)
        modelBuilder.Entity<OrganizationHierarchy>()
            .HasOne(oh => oh.ChildType)
            .WithMany(ot => ot.ChildHierarchies)
            .HasForeignKey(oh => oh.ChildTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // 設定 OrganizationHierarchy 唯一索引
        modelBuilder.Entity<OrganizationHierarchy>()
            .HasIndex(oh => new { oh.ParentTypeId, oh.ChildTypeId })
            .IsUnique();
        
//--------------------     User    --------------------
        
        // 設定 User 與 UserRole 關聯
        modelBuilder.Entity<User>(entity =>
        {
            // User與Organization的關聯
            entity.HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // User與PasswordPolicy的關聯
            entity.HasOne(u => u.PasswordPolicy)
                .WithMany(p => p.Users)
                .HasForeignKey(u => u.PasswordPolicyId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            

            
            // 用戶名唯一索引
            entity.HasIndex(u => new { u.Username, u.Email }).IsUnique();

        });
        
        // UserPasswordHistory表關聯配置
        modelBuilder.Entity<UserPasswordHistory>(entity =>
        {
            entity.HasOne(uph => uph.User)
                .WithMany(u => u.PasswordHistory)
                .HasForeignKey(uph => uph.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 創建時間索引（用於按時間排序）
            entity.HasIndex(uph => uph.CreatedAt);
            
            // 複合索引（用於快速查找特定用戶的密碼歷史）
            entity.HasIndex(uph => new { uph.UserId, uph.CreatedAt });
        });

        //UserRole表關聯配置
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => ur.Id);
            
            entity.HasIndex(ur => new { ur.UserId, ur.RoleId })
                .IsUnique();
            
            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // PasswordPolicy表關聯配置
        modelBuilder.Entity<PasswordPolicy>(entity =>
        {
            // PasswordPolicy與Organization的關聯
            entity.HasOne(pp => pp.Organization)
                .WithMany(o => o.PasswordPolicies)
                .HasForeignKey(pp => pp.OrganizationId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);
        
            // PasswordPolicy與OrganizationType的關聯
            entity.HasOne(pp => pp.OrganizationType)
                .WithMany(ot => ot.PasswordPolicies)
                .HasForeignKey(pp => pp.OrganizationTypeId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);
        
            // 預設策略索引（用於快速查找）
            entity.HasIndex(pp => pp.IsDefault);
            
            // 組織策略索引
            entity.HasIndex(pp => pp.OrganizationId);
            
            // 組織類型策略索引
            entity.HasIndex(pp => pp.OrganizationTypeId);
        });
        
        // RolePermission表關聯配置
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            entity.HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
//--------------------     Kpi    --------------------

        // KpiItemName 關聯
        modelBuilder.Entity<KpiItemName>(entity =>
        {
            entity.HasOne(n => n.KpiItem)
                .WithMany(i => i.KpiItemNames)
                .HasForeignKey(n => n.KpiItemId)
                .OnDelete(DeleteBehavior.Cascade);

            
            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserEmail)
                .HasPrincipalKey(u => u.Email);
        });
        
        // KpiDetailItemName 關聯
        modelBuilder.Entity<KpiDetailItemName>(entity =>
        {
            entity.HasOne(n => n.KpiDetailItem)
                .WithMany(d => d.KpiDetailItemNames)
                .HasForeignKey(n => n.KpiDetailItemId)
                .OnDelete(DeleteBehavior.Cascade);

            
            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserEmail)
                .HasPrincipalKey(u => u.Email);
        });
        
        // KpiItem 關聯
        modelBuilder.Entity<KpiItem>(entity =>
        {
            entity.HasOne(i => i.KpiField)
                .WithMany(f => f.KpiItems)
                .HasForeignKey(i => i.KpiFieldId);
            
            entity.HasOne(i => i.Organization)
                .WithMany()
                .HasForeignKey(i => i.OrganizationId);
            
            entity.HasIndex(i => new { i.IndicatorNumber, i.KpiCategoryId, i.OrganizationId, i.KpiFieldId  })
                .IsUnique();
        });
        
        // KpiDetailItem 關聯
        modelBuilder.Entity<KpiDetailItem>(entity =>
        {
            entity.HasOne(d => d.KpiItem)
                .WithMany(i => i.KpiDetailItems)
                .HasForeignKey(d => d.KpiItemId);
        });
        
        // KpiDetailItemMappingGroup：一次政策修訂計畫，底下掛多筆對照
        modelBuilder.Entity<KpiDetailItemMappingGroup>(entity =>
        {
            entity.HasMany(g => g.Mappings)
                .WithOne(m => m.Group)
                .HasForeignKey(m => m.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // KpiDetailItemMapping 關聯（政策改名/換單位的新舊指標對照；細項可留空代表全部細項，
        // 唯一性/衝突檢查改在 AdminService 用程式碼驗證，因為 nullable 欄位不好用 DB unique index 卡）
        modelBuilder.Entity<KpiDetailItemMapping>(entity =>
        {
            entity.HasOne(m => m.OldKpiItem)
                .WithMany()
                .HasForeignKey(m => m.OldKpiItemId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.NewKpiItem)
                .WithMany()
                .HasForeignKey(m => m.NewKpiItemId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.OldDetailItem)
                .WithMany()
                .HasForeignKey(m => m.OldDetailItemId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.NewDetailItem)
                .WithMany()
                .HasForeignKey(m => m.NewDetailItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // KpiData 關聯
        modelBuilder.Entity<KpiData>(entity =>
        {
            entity.HasOne(d => d.DetailItem)
                .WithMany(i => i.KpiDatas)
                .HasForeignKey(d => d.DetailItemId);

            
            entity.HasOne(d => d.Organization)
                .WithMany()
                .HasForeignKey(d => d.OrganizationId);
            
            entity.HasOne(d => d.KpiCycle)
                .WithMany(c => c.KpiDatas)
                .HasForeignKey(d => d.KpiCycleId);
        });

        // KpiReport 關聯
        modelBuilder.Entity<KpiReport>()
            .HasOne(r => r.KpiData)
            .WithMany(d => d.KpiReports)
            .HasForeignKey(r => r.KpiDataId);
        
        modelBuilder.Entity<KpiReport>()
            .HasIndex(r => new { r.KpiDataId, r.Year, r.Period })
            .IsUnique();
        
//--------------------     file    --------------------

        // 在 DbContext 的 OnModelCreating 方法中配置
    // SuggestFile 實體配置
    modelBuilder.Entity<SuggestFile>(entity =>
    {
        // 設定主鍵
        entity.HasKey(e => e.Id);
        
        // 設定屬性
        entity.Property(e => e.Id)
            .ValueGeneratedOnAdd();
            
        entity.Property(e => e.Year)
            .IsRequired();
            
        entity.Property(e => e.Quarter)
            .IsRequired();
            
        entity.Property(e => e.ReportName)
            .HasMaxLength(255)
            .IsUnicode(true);
            
        entity.Property(e => e.CreatedAt)
            .HasColumnType("datetime2");
            
        entity.Property(e => e.UpdateAt)
            .HasColumnType("datetime2");
            
        // 設定外鍵關聯
        entity.HasOne(d => d.Organization)
            .WithMany()
            .HasForeignKey(d => d.OrganizationId)
            .OnDelete(DeleteBehavior.SetNull);
            
        entity.HasOne(d => d.file)
            .WithMany(p => p.SuggestFiles)
            .HasForeignKey(d => d.FileId)
            .OnDelete(DeleteBehavior.SetNull);


    });
    
    // File 實體配置
    modelBuilder.Entity<File.File>(entity =>
    {
        // 設定主鍵
        entity.HasKey(e => e.Id);
        
        // 設定屬性
        entity.Property(e => e.Id)
            .ValueGeneratedOnAdd();
            
        entity.Property(e => e.FileName)
            .IsRequired()
            .HasMaxLength(255)
            .IsUnicode(true);
            
        entity.Property(e => e.FileUuid)
            .IsRequired()
            .HasMaxLength(50)
            .IsUnicode(false);
            
        entity.Property(e => e.FileType)
            .HasMaxLength(100)
            .IsUnicode(false);
            
        entity.Property(e => e.FilePath)
            .HasMaxLength(500)
            .IsUnicode(true);
            
        entity.Property(e => e.UploadedById)
            .IsRequired();
            
        entity.Property(e => e.UploadedAt)
            .HasColumnType("datetime2")
            .IsRequired();
            
        entity.Property(e => e.FileSize)
            .IsRequired();
            
        entity.Property(e => e.Description)
            .HasMaxLength(500)
            .IsUnicode(true);
            
        entity.Property(e => e.IsActive)
            .IsRequired()
            .HasDefaultValue(true);
            
        entity.Property(e => e.CreatedAt)
            .HasColumnType("datetime2")
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");
            
        entity.Property(e => e.UpdatedAt)
            .HasColumnType("datetime2")
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");
        
        // 設定唯一索引
        entity.HasIndex(e => e.FileUuid)
            .IsUnique()
            .HasDatabaseName("IX_File_FileUuid");
            
        // 設定外鍵關聯
        entity.HasOne(d => d.UploadedBy)
            .WithMany()
            .HasForeignKey(d => d.UploadedById)
            .OnDelete(DeleteBehavior.Restrict);
            
        // 設定一對多關聯到 SuggestFile
        entity.HasMany(e => e.SuggestFiles)
            .WithOne(s => s.file)
            .HasForeignKey(s => s.FileId)
            .OnDelete(DeleteBehavior.SetNull);
        

    });

//--------------------     Agent    --------------------

        modelBuilder.Entity<AgentTool>(entity =>
        {
            entity.HasIndex(t => t.ToolKey).IsUnique();
        });

        modelBuilder.Entity<AgentToolRole>(entity =>
        {
            entity.HasIndex(tr => new { tr.ToolId, tr.RoleId }).IsUnique();

            entity.HasOne(tr => tr.Tool)
                .WithMany(t => t.AgentToolRoles)
                .HasForeignKey(tr => tr.ToolId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tr => tr.Role)
                .WithMany()
                .HasForeignKey(tr => tr.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AgentDocument>(entity =>
        {
            entity.HasIndex(d => d.OrganizationId);
            entity.HasIndex(d => d.Status);

            entity.HasOne(d => d.Organization)
                .WithMany()
                .HasForeignKey(d => d.OrganizationId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AgentConversation>(entity =>
        {
            entity.HasIndex(c => c.UserId);
        });

        modelBuilder.Entity<AgentConversationMessage>(entity =>
        {
            entity.HasIndex(m => new { m.ConversationId, m.CreatedAt });

            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }


    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
