using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Services;

namespace WebAPI1.Entities;



// | **屬性**                    | **說明**                             | **數值範例**        |
//     | ------------------------- | ---------------------------------- | --------------- |
//     | Id                        | 唯一識別碼                              | 1               |
//     | Name                      | 密碼策略名稱                             | "系統預設策略"        |
//     | IsDefault                 | 是否為系統預設策略                          | true            |
//     | MinLength                 | **最小密碼長度**（防止太短的密碼）                | 8               |
//     | MaxLength                 | **最大密碼長度**（防止過長的密碼影響性能）            | 128             |
//     | RequireUppercase          | **是否要求至少一個大寫字母**                   | true            |
//     | RequireLowercase          | **是否要求至少一個小寫字母**                   | true            |
//     | RequireNumber             | **是否要求至少一個數字**                     | true            |
//     | RequireSpecialChar        | **是否要求至少一個特殊字元**（如 !@#$%^&*）       | true            |
//     | PasswordHistoryCount      | **防止重複密碼的歷史記錄數**（使用者不可使用最近 N 次的密碼） | 3               |
//     | PasswordExpiryDays        | **密碼有效天數**（超過此天數必須變更密碼）            | 90              |
//     | PasswordExpiryWarningDays | **密碼過期前的警告天數**                     | 7               |
//     | MinUniqueChars            | **密碼最少需要的不同字元數**（避免使用過於重複的字元）      | 4               |
//     | PreventCommonWords        | **是否禁止使用常見字詞（如 password、123456）**  | true            |
//     | PreventUsernameInclusion  | **是否禁止密碼包含使用者名稱**                  | true            |
//     | LockoutThreshold          | **登入錯誤多少次後鎖定帳號**                   | 5               |
//     | LockoutDurationMinutes    | **帳號鎖定持續時間（分鐘）**                   | 30              |
//     | CreatedAt                 | **密碼策略建立時間**                       | tool.GetTaiwanNow() |
//     | UpdatedAt                 | **密碼策略最後更新時間**                     | tool.GetTaiwanNow() |

/// <summary>
/// 密碼策略表 - 定義系統和組織層級的密碼規則
/// </summary>
public class PasswordPolicy
{
    /// <summary>
    /// 密碼策略ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 策略名稱
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; }

    /// <summary>
    /// 關聯組織ID (null表示系統預設)
    /// </summary>
    public int? OrganizationId { get; set; }

    /// <summary>
    /// 組織類型ID (適用於特定組織類型的預設策略)
    /// </summary>
    public int? OrganizationTypeId { get; set; }

    /// <summary>
    /// 密碼最小長度
    /// </summary>
    [Required]
    public int MinLength { get; set; } = 8;

    /// <summary>
    /// 密碼最大長度
    /// </summary>
    [Required]
    public int MaxLength { get; set; } = 128;

    /// <summary>
    /// 是否需要包含大寫字母
    /// </summary>
    [Required]
    public bool RequireUppercase { get; set; } = true;

    /// <summary>
    /// 是否需要包含小寫字母
    /// </summary>
    [Required]
    public bool RequireLowercase { get; set; } = true;

    /// <summary>
    /// 是否需要包含數字
    /// </summary>
    [Required]
    public bool RequireNumber { get; set; } = true;

    /// <summary>
    /// 是否需要包含特殊符號
    /// </summary>
    [Required]
    public bool RequireSpecialChar { get; set; } = true;

    /// <summary>
    /// 禁止重複使用前N次密碼
    /// </summary>
    [Required]
    public int PasswordHistoryCount { get; set; } = 3;

    /// <summary>
    /// 密碼有效期限(天)，0表示永不過期
    /// </summary>
    [Required]
    public int PasswordExpiryDays { get; set; } = 90;

    /// <summary>
    /// 密碼到期前警告(天)
    /// </summary>
    [Required]
    public int PasswordExpiryWarningDays { get; set; } = 7;

    /// <summary>
    /// 是否為預設策略
    /// </summary>
    [Required]
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 允許用戶自定義規則
    /// </summary>
    [Required]
    public bool AllowUserOverride { get; set; } = false;

    /// <summary>
    /// 允許的特殊字符集 (JSON格式)
    /// </summary>
    public string? SpecialChars { get; set; } = "!@#$%^&*()_+-=[]{}|:;\"'<>,.?/~`";

    /// <summary>
    /// 最小不重複字符數
    /// </summary>
    [Required]
    public int MinUniqueChars { get; set; } = 4;

    /// <summary>
    /// 是否禁止使用常見詞
    /// </summary>
    [Required]
    public bool PreventCommonWords { get; set; } = true;

    /// <summary>
    /// 是否禁止包含用戶名
    /// </summary>
    [Required]
    public bool PreventUsernameInclusion { get; set; } = true;

    /// <summary>
    /// 登入失敗N次後鎖定帳號
    /// </summary>
    [Required]
    public int LockoutThreshold { get; set; } = 5;

    /// <summary>
    /// 帳號鎖定時間(分鐘)
    /// </summary>
    [Required]
    public int LockoutDurationMinutes { get; set; } = 30;

    /// <summary>
    /// 創建時間
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 更新時間
    /// </summary>
    [Required]
    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 導覽屬性：關聯組織
    /// </summary>
    [ForeignKey("OrganizationId")]
    public virtual Organization? Organization { get; set; }

    /// <summary>
    /// 導覽屬性：關聯組織類型
    /// </summary>
    [ForeignKey("OrganizationTypeId")]
    public virtual OrganizationType? OrganizationType { get; set; }
    
    /// <summary>
    /// 導覽屬性：使用此策略的用戶
    /// </summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}