using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class UserPasswordHistory
{
    /// <summary>
    /// 密碼歷史記錄ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 用戶ID
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// 加密後的歷史密碼
    /// </summary>
    [Required]
    public string PasswordHash { get; set; }

    /// <summary>
    /// 密碼加密鹽值
    /// </summary>
    [Required]
    public byte[] Salt { get; set; }

    /// <summary>
    /// 密碼創建(變更)時間
    /// </summary>
    [Required]
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 密碼強度分數 (1-5)
    /// </summary>
    public int? StrengthScore { get; set; }

    /// <summary>
    /// 導覽屬性：關聯用戶
    /// </summary>
    [ForeignKey("UserId")]
    public virtual User User { get; set; }
}