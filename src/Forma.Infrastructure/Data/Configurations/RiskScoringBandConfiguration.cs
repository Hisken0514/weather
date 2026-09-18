using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class RiskScoringBandConfiguration : IEntityTypeConfiguration<RiskScoringBand>
{
    public void Configure(EntityTypeBuilder<RiskScoringBand> builder)
    {
        builder.ToTable("RiskScoringBands");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.MinValue)
            .HasPrecision(18, 4);

        builder.Property(b => b.MaxValue)
            .HasPrecision(18, 4);

        builder.Property(b => b.Label)
            .HasMaxLength(200);

        builder.HasOne(b => b.Indicator)
            .WithMany()
            .HasForeignKey(b => b.IndicatorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => new { b.SchemeId, b.IndicatorId });
    }
}
