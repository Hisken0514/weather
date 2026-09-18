using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("Projects");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.Description)
            .HasMaxLength(2000);

        builder.Property(p => p.Budget)
            .HasPrecision(18, 2);

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(p => p.Organization)
            .WithMany(o => o.Projects)
            .HasForeignKey(p => p.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.CreatedBy)
            .WithMany(u => u.CreatedProjects)
            .HasForeignKey(p => p.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(p => p.Code).IsUnique();
        builder.HasIndex(p => p.OrganizationId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.Year);
    }
}
