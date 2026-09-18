using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FormSubmissionConfiguration : IEntityTypeConfiguration<FormSubmission>
{
    public void Configure(EntityTypeBuilder<FormSubmission> builder)
    {
        builder.ToTable("FormSubmissions");

        builder.HasKey(fs => fs.Id);

        builder.Property(fs => fs.SubmissionData)
            .IsRequired()
            .HasColumnType("jsonb");

        builder.Property(fs => fs.FormVersion)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(fs => fs.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(fs => fs.IpAddress)
            .HasMaxLength(45);

        // Relationships
        builder.HasOne(fs => fs.Form)
            .WithMany(f => f.Submissions)
            .HasForeignKey(fs => fs.FormId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(fs => fs.Project)
            .WithMany(p => p.Submissions)
            .HasForeignKey(fs => fs.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(fs => fs.SubmittedBy)
            .WithMany(u => u.Submissions)
            .HasForeignKey(fs => fs.SubmittedById)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(fs => fs.ReviewedBy)
            .WithMany()
            .HasForeignKey(fs => fs.ReviewedById)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(fs => fs.FormId);
        builder.HasIndex(fs => fs.ProjectId);
        builder.HasIndex(fs => fs.Status);
        builder.HasIndex(fs => fs.SubmittedAt);
    }
}
