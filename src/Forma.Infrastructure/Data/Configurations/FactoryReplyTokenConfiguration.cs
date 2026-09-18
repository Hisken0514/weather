using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryReplyTokenConfiguration : IEntityTypeConfiguration<FactoryReplyToken>
{
    public void Configure(EntityTypeBuilder<FactoryReplyToken> builder)
    {
        builder.ToTable("FactoryReplyTokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token)
            .IsRequired()
            .HasMaxLength(64);

        builder.HasOne(t => t.Factory)
            .WithMany()
            .HasForeignKey(t => t.SupervisedFactoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.Token).IsUnique();
        builder.HasIndex(t => t.SupervisedFactoryId).IsUnique();
    }
}
