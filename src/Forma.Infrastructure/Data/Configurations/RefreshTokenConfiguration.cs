using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.Token)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(rt => rt.ReplacedByToken)
            .HasMaxLength(256);

        builder.Property(rt => rt.RevokedReason)
            .HasMaxLength(256);

        builder.Property(rt => rt.DeviceInfo)
            .HasMaxLength(512);

        builder.Property(rt => rt.IpAddress)
            .HasMaxLength(45); // IPv6 最大長度

        // Relationship
        builder.HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(rt => rt.Token).IsUnique();
        builder.HasIndex(rt => rt.UserId);
        builder.HasIndex(rt => rt.ExpiresAt);
    }
}
