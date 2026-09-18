using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class AgencyReviewConfiguration : IEntityTypeConfiguration<AgencyReview>
{
    public void Configure(EntityTypeBuilder<AgencyReview> builder)
    {
        builder.ToTable("AgencyReviews");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ReviewerAgencyName)
            .HasMaxLength(200);

        builder.Property(r => r.ReviewerName)
            .HasMaxLength(100);

        builder.Property(r => r.ReviewerContact)
            .HasMaxLength(200);

        builder.HasOne(r => r.Task)
            .WithOne(t => t.AgencyReview)
            .HasForeignKey<AgencyReview>(r => r.SupervisionTaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.SubmittedByUser)
            .WithMany()
            .HasForeignKey(r => r.SubmittedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(r => r.SupervisionTaskId).IsUnique();
    }
}
