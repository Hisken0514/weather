using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("Reports");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.Configuration)
            .IsRequired()
            .HasColumnType("jsonb");

        // Relationships
        builder.HasOne(r => r.Form)
            .WithMany(f => f.Reports)
            .HasForeignKey(r => r.FormId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.CreatedBy)
            .WithMany()
            .HasForeignKey(r => r.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(r => r.FormId);
    }
}
