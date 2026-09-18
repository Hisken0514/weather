using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryReplyConfiguration : IEntityTypeConfiguration<FactoryReply>
{
    public void Configure(EntityTypeBuilder<FactoryReply> builder)
    {
        builder.ToTable("FactoryReplies");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.FillerUnitName)
            .HasMaxLength(200);

        builder.Property(r => r.FillerName)
            .HasMaxLength(100);

        builder.Property(r => r.FillerContact)
            .HasMaxLength(200);

        builder.HasOne(r => r.Task)
            .WithOne(t => t.FactoryReply)
            .HasForeignKey<FactoryReply>(r => r.SupervisionTaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.SupervisionTaskId).IsUnique();
    }
}
