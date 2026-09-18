using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.HasKey(al => al.Id);

        builder.Property(al => al.Action)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(al => al.EntityType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(al => al.Changes)
            .HasColumnType("jsonb");

        builder.Property(al => al.IpAddress)
            .HasMaxLength(45);

        // Relationships
        builder.HasOne(al => al.User)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes
        builder.HasIndex(al => al.UserId);
        builder.HasIndex(al => al.EntityType);
        builder.HasIndex(al => al.EntityId);
        builder.HasIndex(al => al.Timestamp);
        builder.HasIndex(al => al.Action);
    }
}
