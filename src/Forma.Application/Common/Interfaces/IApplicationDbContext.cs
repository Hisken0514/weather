using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Common.Interfaces;

/// <summary>
/// 應用程式資料庫上下文介面
/// </summary>
public interface IApplicationDbContext
{
    /// <summary>
    /// 使用者
    /// </summary>
    DbSet<User> Users { get; }

    /// <summary>
    /// Refresh Token
    /// </summary>
    DbSet<RefreshToken> RefreshTokens { get; }

    /// <summary>
    /// 組織
    /// </summary>
    DbSet<Organization> Organizations { get; }

    /// <summary>
    /// 專案
    /// </summary>
    DbSet<Project> Projects { get; }

    /// <summary>
    /// 專案成員
    /// </summary>
    DbSet<ProjectMember> ProjectMembers { get; }

    /// <summary>
    /// 表單
    /// </summary>
    DbSet<Form> Forms { get; }

    /// <summary>
    /// 表單範本
    /// </summary>
    DbSet<FormTemplate> FormTemplates { get; }

    /// <summary>
    /// 表單版本
    /// </summary>
    DbSet<FormVersion> FormVersions { get; }

    /// <summary>
    /// 表單提交
    /// </summary>
    DbSet<FormSubmission> FormSubmissions { get; }

    /// <summary>
    /// 表單權限
    /// </summary>
    DbSet<FormPermission> FormPermissions { get; }

    /// <summary>
    /// 報告
    /// </summary>
    DbSet<Report> Reports { get; }

    /// <summary>
    /// 匯出任務
    /// </summary>
    DbSet<Export> Exports { get; }

    /// <summary>
    /// 通知
    /// </summary>
    DbSet<Notification> Notifications { get; }

    /// <summary>
    /// 通知偏好設定
    /// </summary>
    DbSet<NotificationPreference> NotificationPreferences { get; }

    /// <summary>
    /// 上傳檔案
    /// </summary>
    DbSet<UploadedFile> UploadedFiles { get; }

    /// <summary>
    /// 稽核日誌
    /// </summary>
    DbSet<AuditLog> AuditLogs { get; }

    /// <summary>
    /// 操作日誌
    /// </summary>
    DbSet<ActionLog> ActionLogs { get; }

    /// <summary>
    /// 系統設定
    /// </summary>
    DbSet<SystemSetting> SystemSettings { get; }

    /// <summary>
    /// 信件範本
    /// </summary>
    DbSet<EmailTemplate> EmailTemplates { get; }

    /// <summary>
    /// 角色
    /// </summary>
    DbSet<Role> Roles { get; }

    /// <summary>
    /// 郵件日誌
    /// </summary>
    DbSet<EmailLog> EmailLogs { get; }

    /// <summary>
    /// FIDO2 憑證
    /// </summary>
    DbSet<FidoCredential> FidoCredentials { get; }

    /// <summary>
    /// 使用者產業園區綁定
    /// </summary>
    DbSet<UserIndustrialPark> UserIndustrialParks { get; }

    // Supervision

    /// <summary>
    /// 轄區
    /// </summary>
    DbSet<Region> Regions { get; }

    /// <summary>
    /// 督導機關
    /// </summary>
    DbSet<Agency> Agencies { get; }

    /// <summary>
    /// 機關對應表單類型
    /// </summary>
    DbSet<AgencyFormType> AgencyFormTypes { get; }

    /// <summary>
    /// 機關使用者綁定
    /// </summary>
    DbSet<AgencyUser> AgencyUsers { get; }

    /// <summary>
    /// 年度督導計畫
    /// </summary>
    DbSet<SupervisionCampaign> SupervisionCampaigns { get; }

    /// <summary>
    /// 被督導業者
    /// </summary>
    DbSet<SupervisedFactory> SupervisedFactories { get; }

    /// <summary>
    /// 督導任務
    /// </summary>
    DbSet<SupervisionTask> SupervisionTasks { get; }

    /// <summary>
    /// 全台工廠主資料
    /// </summary>
    DbSet<FactoryMaster> FactoryMasters { get; }

    // 督導第二輪：改善回覆與複查

    /// <summary>工廠改善回覆</summary>
    DbSet<FactoryReply> FactoryReplies { get; }

    /// <summary>工廠改善回覆的逐點項目（Admin 新增/刪除）</summary>
    DbSet<FactoryReplyItem> FactoryReplyItems { get; }

    /// <summary>機關複查登打</summary>
    DbSet<AgencyReview> AgencyReviews { get; }

    /// <summary>工廠改善回覆公開連結 Token</summary>
    DbSet<FactoryReplyToken> FactoryReplyTokens { get; }

    /// <summary>機關複查登打公開連結 Token</summary>
    DbSet<AgencyReviewToken> AgencyReviewTokens { get; }

    // 危險品風險評分標準

    /// <summary>年度風險評分標準</summary>
    DbSet<RiskScoringScheme> RiskScoringSchemes { get; }

    /// <summary>年度標準自訂的風險評分指標</summary>
    DbSet<RiskIndicatorDefinition> RiskIndicatorDefinitions { get; }

    /// <summary>年度標準自訂的危險化學品類型</summary>
    DbSet<HazardChemicalTypeDefinition> HazardChemicalTypeDefinitions { get; }

    /// <summary>風險指標分段計分規則</summary>
    DbSet<RiskScoringBand> RiskScoringBands { get; }

    /// <summary>危品類型危害性等級</summary>
    DbSet<HazardTypeLevel> HazardTypeLevels { get; }

    /// <summary>各危品類型使用量級距</summary>
    DbSet<QuantityThreshold> QuantityThresholds { get; }

    // 全台工廠風險排名（歷史資料匯入）

    /// <summary>全台工廠風險排名清單裡的工廠</summary>
    DbSet<RiskAssessedFactory> RiskAssessedFactories { get; }

    /// <summary>工廠在某年度標準底下的風險計算輸入值</summary>
    DbSet<FactoryRiskInput> FactoryRiskInputs { get; }

    /// <summary>FactoryRiskInput 底下各指標的原始輸入值</summary>
    DbSet<FactoryIndicatorValue> FactoryIndicatorValues { get; }

    /// <summary>
    /// 儲存變更
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
