using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryReplyItemConfiguration : IEntityTypeConfiguration<FactoryReplyItem>
{
    public void Configure(EntityTypeBuilder<FactoryReplyItem> builder)
    {
        builder.ToTable("FactoryReplyItems");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(i => i.ReplyText)
            .HasMaxLength(4000);

        builder.Property(i => i.ImprovementStatus)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(i => i.Remarks)
            .HasMaxLength(2000);

        builder.Property(i => i.Result)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(i => i.ResultOtherText)
            .HasMaxLength(500);

        builder.Property(i => i.ViolatedRegulation)
            .HasMaxLength(500);

        builder.Property(i => i.PenaltyAmount)
            .HasColumnType("decimal(12,2)");

        builder.Property(i => i.AgencyRemarks)
            .HasMaxLength(2000);

        builder.HasOne(i => i.Task)
            .WithMany(t => t.FactoryReplyItems)
            .HasForeignKey(i => i.SupervisionTaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => i.SupervisionTaskId);
    }
}
