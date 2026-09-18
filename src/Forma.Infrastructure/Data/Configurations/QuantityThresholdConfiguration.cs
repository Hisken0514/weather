using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class QuantityThresholdConfiguration : IEntityTypeConfiguration<QuantityThreshold>
{
    public void Configure(EntityTypeBuilder<QuantityThreshold> builder)
    {
        builder.ToTable("QuantityThresholds");

        builder.HasKey(q => q.Id);

        builder.Property(q => q.MinQuantity)
            .HasPrecision(18, 4);

        builder.Property(q => q.MaxQuantity)
            .HasPrecision(18, 4);

        builder.HasOne(q => q.ChemicalType)
            .WithMany()
            .HasForeignKey(q => q.ChemicalTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // 同一年度標準內，每個類型的每個級距唯一
        builder.HasIndex(q => new { q.SchemeId, q.ChemicalTypeId, q.Level }).IsUnique();
    }
}
