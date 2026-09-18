using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiReportSnapshot
{
    [Key]
    public int Id { get; set; }

    public int KpiDataId { get; set; }
    public int OrganizationId { get; set; }
    public int Year { get; set; }
    public string Period { get; set; } = "";

    [Column(TypeName = "decimal(18, 4)")]
    public decimal? Value { get; set; }

    public bool IsSkipped { get; set; }
    public string? Remarks { get; set; }

    /// <summary>第幾次送出（從 1 開始）</summary>
    public int Version { get; set; }

    public DateTime SubmittedAt { get; set; }
    public Guid? SubmittedByUserId { get; set; }
    public string? SubmittedByUserName { get; set; }

    [ForeignKey("KpiDataId")]
    public virtual KpiData KpiData { get; set; } = null!;
}
