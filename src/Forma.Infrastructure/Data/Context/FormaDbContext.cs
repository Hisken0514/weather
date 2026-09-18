using Forma.Application.Common.Interfaces;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Infrastructure.Data.Context;

/// <summary>
/// Forma 資料庫上下文
/// </summary>
public class FormaDbContext : DbContext, IApplicationDbContext
{
    public FormaDbContext(DbContextOptions<FormaDbContext> options) : base(options)
    {
    }

    // DbSets
    public DbSet<User> Users => Set<User>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();
    public DbSet<FormTemplate> FormTemplates => Set<FormTemplate>();
    public DbSet<FormVersion> FormVersions => Set<FormVersion>();
    public DbSet<FormPermission> FormPermissions => Set<FormPermission>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Export> Exports => Set<Export>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UploadedFile> UploadedFiles => Set<UploadedFile>();
    public DbSet<ActionLog> ActionLogs => Set<ActionLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<FidoCredential> FidoCredentials => Set<FidoCredential>();

    // 使用者產業園區綁定
    public DbSet<UserIndustrialPark> UserIndustrialParks => Set<UserIndustrialPark>();

    // Supervision
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<Agency> Agencies => Set<Agency>();
    public DbSet<AgencyFormType> AgencyFormTypes => Set<AgencyFormType>();
    public DbSet<AgencyUser> AgencyUsers => Set<AgencyUser>();
    public DbSet<SupervisionCampaign> SupervisionCampaigns => Set<SupervisionCampaign>();
    public DbSet<SupervisedFactory> SupervisedFactories => Set<SupervisedFactory>();
    public DbSet<SupervisionTask> SupervisionTasks => Set<SupervisionTask>();
    public DbSet<FactoryMaster> FactoryMasters => Set<FactoryMaster>();

    // 督導第二輪：改善回覆與複查
    public DbSet<FactoryReply> FactoryReplies => Set<FactoryReply>();
    public DbSet<FactoryReplyItem> FactoryReplyItems => Set<FactoryReplyItem>();
    public DbSet<AgencyReview> AgencyReviews => Set<AgencyReview>();
    public DbSet<FactoryReplyToken> FactoryReplyTokens => Set<FactoryReplyToken>();
    public DbSet<AgencyReviewToken> AgencyReviewTokens => Set<AgencyReviewToken>();

    // 危險品風險評分標準
    public DbSet<RiskScoringScheme> RiskScoringSchemes => Set<RiskScoringScheme>();
    public DbSet<RiskIndicatorDefinition> RiskIndicatorDefinitions => Set<RiskIndicatorDefinition>();
    public DbSet<HazardChemicalTypeDefinition> HazardChemicalTypeDefinitions => Set<HazardChemicalTypeDefinition>();
    public DbSet<RiskScoringBand> RiskScoringBands => Set<RiskScoringBand>();
    public DbSet<HazardTypeLevel> HazardTypeLevels => Set<HazardTypeLevel>();
    public DbSet<QuantityThreshold> QuantityThresholds => Set<QuantityThreshold>();

    // 全台工廠風險排名（歷史資料匯入）
    public DbSet<RiskAssessedFactory> RiskAssessedFactories => Set<RiskAssessedFactory>();
    public DbSet<FactoryRiskInput> FactoryRiskInputs => Set<FactoryRiskInput>();
    public DbSet<FactoryIndicatorValue> FactoryIndicatorValues => Set<FactoryIndicatorValue>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 套用所有實體配置
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FormaDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // 自動設定審計欄位
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
