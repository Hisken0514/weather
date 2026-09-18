using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Services;
using File = WebAPI1.Entities;

namespace WebAPI1.Entities;

public class User
{
    /// <summary>
    /// 用戶ID
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// 登入帳號名
    /// </summary>
    [Required, MaxLength(25)]
    public string Username { get; set; }

    /// <summary>
    /// 加密後的密碼
    /// </summary>
    public string? PasswordHash { get; set; }

    /// <summary>
    /// 顯示名稱
    /// </summary>
    [MaxLength(50)]
    public string? Nickname { get; set; }

    /// <summary>
    /// 所屬組織ID
    /// </summary>
    public int OrganizationId { get; set; }
    

    /// <summary>
    /// 手機號碼
    /// </summary>
    [MaxLength(40)]
    public string? Mobile { get; set; }

    /// <summary>
    /// 電子郵件
    /// </summary>
    [MaxLength(255)]
    public string? Email { get; set; }
    
    /// <summary>
    /// 單位
    /// </summary>
    public string? Unit { get; set; }
    
    /// <summary>
    /// 職稱
    /// </summary>
    public string? Position { get; set; }

    /// <summary>
    /// 頭像圖片路徑
    /// </summary>
    [MaxLength(255)]
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// 電子郵件是否已驗證
    /// </summary>
    public bool EmailVerified { get; set; } = true;

    /// <summary>
    /// 電子郵件驗證時間
    /// </summary>
    public DateTime? EmailVerifiedAt { get; set; }

    /// <summary>
    /// 電子郵件驗證令牌
    /// </summary>
    [MaxLength(100)]
    public string? VerificationToken { get; set; }

    /// <summary>
    /// 令牌過期時間
    /// </summary>
    public DateTime? TokenExpiresAt { get; set; }

    /// <summary>
    /// 註冊時使用的郵件域名
    /// </summary>
    [MaxLength(255)]
    public string? RegistrationDomain { get; set; }

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 帳號是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最後登入時間
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    // 密碼規則相關擴充欄位

    /// <summary>
    /// 自定義密碼規則ID
    /// </summary>
    public int? PasswordPolicyId { get; set; }

    /// <summary>
    /// 最後密碼變更時間
    /// </summary>
    public DateTime? PasswordChangedAt { get; set; }

    /// <summary>
    /// 密碼過期時間
    /// </summary>
    public DateTime? PasswordExpiresAt { get; set; }

    /// <summary>
    /// 是否強制變更密碼
    /// </summary>
    public bool ForceChangePassword { get; set; } = false;

    /// <summary>
    /// 密碼失敗嘗試次數
    /// </summary>
    public int PasswordFailedAttempts { get; set; } = 0;

    /// <summary>
    /// 密碼鎖定至時間
    /// </summary>
    public DateTime? PasswordLockedUntil { get; set; }

    /// <summary>
    /// 上一次提醒密碼過期的時間
    /// </summary>
    public DateTime? LastPasswordExpiryReminder { get; set; }

    /// <summary>
    /// 是否已在表單系統（Forma）完成帳號建立
    /// </summary>
    public bool FormaRegistered { get; set; } = false;

    /// <summary>
    /// 導覽屬性：所屬組織
    /// </summary>
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }

    /// <summary>
    /// 導覽屬性：自定義密碼策略
    /// </summary>
    [ForeignKey("PasswordPolicyId")]
    public virtual PasswordPolicy? PasswordPolicy { get; set; }
    
    /// <summary>
    /// 導覽屬性：用戶角色
    /// </summary>
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    /// <summary>
    /// 導覽屬性：密碼歷史記錄
    /// </summary>
    public virtual ICollection<UserPasswordHistory> PasswordHistory { get; set; } = new List<UserPasswordHistory>();
    
    /// <summary>
    /// 導覽屬性：建議資料
    /// </summary>
    public virtual ICollection<SuggestReport> SuggestReports { get; set; } = new List<SuggestReport>();
    
    /// <summary>
    /// 導覽屬性：建議資料
    /// </summary>
    public virtual ICollection<SuggestFile> SuggestFiles { get; set; } = new List<SuggestFile>();
    
    
    public virtual ICollection<File> Files { get; set; } = new List<File>();
}