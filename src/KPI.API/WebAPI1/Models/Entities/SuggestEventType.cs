using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;


public class SuggestEventType
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();
    
    public virtual ICollection<SuggestDate> SuggestDates { get; set; } = new List<SuggestDate>();
}