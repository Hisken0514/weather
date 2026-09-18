using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FormPermissionConfiguration : IEntityTypeConfiguration<FormPermission>
{
    public void Configure(EntityTypeBuilder<FormPermission> builder)
    {
        builder.ToTable("FormPermissions");

        builder.HasKey(fp => fp.Id);

        builder.Property(fp => fp.ProjectMemberRole)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(fp => fp.PermissionType)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Relationships
        builder.HasOne(fp => fp.Form)
            .WithMany(f => f.Permissions)
            .HasForeignKey(fp => fp.FormId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(fp => fp.User)
            .WithMany()
            .HasForeignKey(fp => fp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(fp => fp.GrantedBy)
            .WithMany()
            .HasForeignKey(fp => fp.GrantedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(fp => fp.FormId);
        builder.HasIndex(fp => fp.UserId);
        builder.HasIndex(fp => fp.PermissionType);
    }
}
