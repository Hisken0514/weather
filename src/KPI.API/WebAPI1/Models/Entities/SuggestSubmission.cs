using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public enum SuggestSubmissionStatus
{
    Submitted = 1,
    Returned  = 2,
}

public class SuggestSubmission
{
    [Key]
    public int Id { get; set; }

    public int OrganizationId { get; set; }
    public int Year { get; set; }
    public string Period { get; set; } = "";

    public SuggestSubmissionStatus Status { get; set; } = SuggestSubmissionStatus.Submitted;

    public DateTime SubmittedAt { get; set; }
    public Guid? SubmittedByUserId { get; set; }
    public string? SubmittedByUserName { get; set; }

    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; } = null!;
}
