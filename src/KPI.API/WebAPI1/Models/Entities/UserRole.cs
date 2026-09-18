using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class UserRole
{
    /// <summary>
    /// 主鍵ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 用戶ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 角色ID
    /// </summary>
    public int RoleId { get; set; }

    /// <summary>
    /// 分配時間
    /// </summary>
    public DateTime AssignedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 分配人ID
    /// </summary>
    public Guid AssignedBy { get; set; }

    /// <summary>
    /// 導覽屬性：用戶
    /// </summary>
    [ForeignKey("UserId")]
    public virtual User User { get; set; }

    /// <summary>
    /// 導覽屬性：角色
    /// </summary>
    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; }
}