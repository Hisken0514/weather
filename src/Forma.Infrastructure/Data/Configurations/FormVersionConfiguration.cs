using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FormVersionConfiguration : IEntityTypeConfiguration<FormVersion>
{
    public void Configure(EntityTypeBuilder<FormVersion> builder)
    {
        builder.ToTable("FormVersions");

        builder.HasKey(fv => fv.Id);

        builder.Property(fv => fv.Version)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(fv => fv.Schema)
            .IsRequired()
            .HasColumnType("jsonb");

        builder.Property(fv => fv.ChangeNote)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(fv => fv.Form)
            .WithMany(f => f.Versions)
            .HasForeignKey(fv => fv.FormId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(fv => fv.CreatedBy)
            .WithMany()
            .HasForeignKey(fv => fv.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(fv => fv.FormId);
        builder.HasIndex(fv => new { fv.FormId, fv.Version }).IsUnique();
    }
}
