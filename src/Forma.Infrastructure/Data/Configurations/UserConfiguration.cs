using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Username)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(u => u.Department)
            .HasMaxLength(100);

        builder.Property(u => u.JobTitle)
            .HasMaxLength(100);

        builder.Property(u => u.PhoneNumber)
            .HasMaxLength(20);

        // Role FK
        builder.HasOne(u => u.Role)
            .WithMany()
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(u => u.RoleId);

        // Indexes
        builder.HasIndex(u => u.Username);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.IsActive);
    }
}
