using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class SuggestionType
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();
    
    public virtual ICollection<SuggestReport> SuggestReports { get; set; } = new List<SuggestReport>();
}