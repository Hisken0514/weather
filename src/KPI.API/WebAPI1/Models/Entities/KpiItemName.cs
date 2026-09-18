using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiItemName
{
    [Key]
    public int Id { get; set; }
    public int KpiItemId { get; set; }
    public string Name { get; set; }
    public int StartYear { get; set; }
    public int? EndYear { get; set; }
    public string UserEmail { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdateAt { get; set; }
    
    [ForeignKey("KpiItemId")]
    public virtual KpiItem KpiItem { get; set; }
    
    [ForeignKey("UserEmail")]
    public virtual User User { get; set; }
}