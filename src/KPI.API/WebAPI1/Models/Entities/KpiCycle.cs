using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

public class KpiCycle
{
    [Key]
    public int Id { get; set; }
    public string CycleName { get; set; }
    public int StartYear { get; set; }
    public int EndYear { get; set; }
    public DateTime CreateTime { get; set; }
    public DateTime UploadTime { get; set; }
    
    public virtual ICollection<KpiData> KpiDatas { get; set; } = new List<KpiData>();
}