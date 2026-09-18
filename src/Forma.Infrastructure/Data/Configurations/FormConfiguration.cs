using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FormConfiguration : IEntityTypeConfiguration<Form>
{
    public void Configure(EntityTypeBuilder<Form> builder)
    {
        builder.ToTable("Forms");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Description)
            .HasMaxLength(2000);

        builder.Property(f => f.Schema)
            .IsRequired()
            .HasColumnType("jsonb");

        builder.Property(f => f.Version)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(f => f.AccessControl)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(f => f.Project)
            .WithMany(p => p.Forms)
            .HasForeignKey(f => f.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.CreatedBy)
            .WithMany(u => u.CreatedForms)
            .HasForeignKey(f => f.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.Template)
            .WithMany(t => t.Forms)
            .HasForeignKey(f => f.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(f => f.LockedBy)
            .WithMany(u => u.LockedForms)
            .HasForeignKey(f => f.LockedById)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(f => f.ProjectId);
        builder.HasIndex(f => f.IsActive);
        builder.HasIndex(f => f.PublishedAt);
    }
}
