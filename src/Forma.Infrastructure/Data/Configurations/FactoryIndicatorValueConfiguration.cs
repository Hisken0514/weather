using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryIndicatorValueConfiguration : IEntityTypeConfiguration<FactoryIndicatorValue>
{
    public void Configure(EntityTypeBuilder<FactoryIndicatorValue> builder)
    {
        builder.ToTable("FactoryIndicatorValues");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.IndicatorCanonicalKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(v => v.Value)
            .HasPrecision(18, 4);

        builder.HasOne(v => v.FactoryRiskInput)
            .WithMany(i => i.IndicatorValues)
            .HasForeignKey(v => v.FactoryRiskInputId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(v => new { v.FactoryRiskInputId, v.IndicatorCanonicalKey }).IsUnique();
    }
}
