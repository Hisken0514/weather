using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class ProjectMemberConfiguration : IEntityTypeConfiguration<ProjectMember>
{
    public void Configure(EntityTypeBuilder<ProjectMember> builder)
    {
        builder.ToTable("ProjectMembers");

        builder.HasKey(pm => pm.Id);

        builder.Property(pm => pm.Role)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(pm => pm.Project)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pm => pm.User)
            .WithMany(u => u.ProjectMemberships)
            .HasForeignKey(pm => pm.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pm => pm.AddedBy)
            .WithMany()
            .HasForeignKey(pm => pm.AddedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pm => pm.RemovedBy)
            .WithMany()
            .HasForeignKey(pm => pm.RemovedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(pm => new { pm.ProjectId, pm.UserId }).IsUnique();
        builder.HasIndex(pm => pm.Role);
    }
}
