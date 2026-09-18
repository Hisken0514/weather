using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

/// <summary>
/// 檔案實體，用於存儲系統中上傳的檔案信息
/// </summary>
public class File
{
    /// <summary>
    /// 自增主鍵
    /// </summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    /// <summary>
    /// 原始檔案名稱
    /// </summary>
    [Required]
    [StringLength(255)]
    public string FileName { get; set; }

    /// <summary>
    /// 唯一檔案識別碼
    /// </summary>
    [Required]
    [StringLength(50)]
    public string FileUuid { get; set; }

    /// <summary>
    /// 檔案類型
    /// </summary>
    [StringLength(100)]
    public string FileType { get; set; }

    /// <summary>
    /// 檔案存儲路徑
    /// </summary>
    [StringLength(500)]
    public string FilePath { get; set; }

    /// <summary>
    /// 上傳者ID，關聯User表
    /// </summary>
    public Guid UploadedById { get; set; }

    /// <summary>
    /// 上傳時間
    /// </summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>
    /// 檔案大小(bytes)
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// 檔案描述
    /// </summary>
    [StringLength(500)]
    public string Description { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    
    /// <summary>
    /// 上傳者導航屬性
    /// </summary>
    [ForeignKey("UploadedById")]
    public virtual User UploadedBy { get; set; }

    public virtual ICollection<SuggestFile> SuggestFiles { get; set; } = new List<SuggestFile>();
    
    
}