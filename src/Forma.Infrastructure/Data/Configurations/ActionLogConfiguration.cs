using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class ActionLogConfiguration : IEntityTypeConfiguration<ActionLog>
{
    public void Configure(EntityTypeBuilder<ActionLog> builder)
    {
        builder.ToTable("ActionLogs");

        builder.HasKey(al => al.Id);

        builder.Property(al => al.Id)
            .UseIdentityColumn();

        builder.Property(al => al.ActionType)
            .HasMaxLength(50);

        builder.Property(al => al.ActionName)
            .HasMaxLength(200);

        builder.Property(al => al.UserId)
            .HasMaxLength(100);

        builder.Property(al => al.UserName)
            .HasMaxLength(200);

        builder.Property(al => al.EntityType)
            .HasMaxLength(100);

        builder.Property(al => al.EntityId)
            .HasMaxLength(100);

        builder.Property(al => al.EntityName)
            .HasMaxLength(500);

        builder.Property(al => al.Description)
            .HasMaxLength(2000);

        builder.Property(al => al.IpAddress)
            .HasMaxLength(45);

        builder.Property(al => al.UserAgent)
            .HasMaxLength(500);

        builder.Property(al => al.ErrorMessage)
            .HasMaxLength(2000);

        // Indexes for common query patterns
        builder.HasIndex(al => al.UserId);
        builder.HasIndex(al => al.ActionType);
        builder.HasIndex(al => al.EntityType);
        builder.HasIndex(al => al.CreatedAt);
        builder.HasIndex(al => al.IsSuccess);
    }
}
