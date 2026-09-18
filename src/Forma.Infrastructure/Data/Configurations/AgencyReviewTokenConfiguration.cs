using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class AgencyReviewTokenConfiguration : IEntityTypeConfiguration<AgencyReviewToken>
{
    public void Configure(EntityTypeBuilder<AgencyReviewToken> builder)
    {
        builder.ToTable("AgencyReviewTokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token)
            .IsRequired()
            .HasMaxLength(64);

        builder.HasOne(t => t.Campaign)
            .WithMany()
            .HasForeignKey(t => t.SupervisionCampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Agency)
            .WithMany()
            .HasForeignKey(t => t.AgencyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.Token).IsUnique();
        builder.HasIndex(t => new { t.SupervisionCampaignId, t.AgencyId }).IsUnique();
    }
}
