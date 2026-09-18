using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class HazardTypeLevelConfiguration : IEntityTypeConfiguration<HazardTypeLevel>
{
    public void Configure(EntityTypeBuilder<HazardTypeLevel> builder)
    {
        builder.ToTable("HazardTypeLevels");

        builder.HasKey(h => h.Id);

        builder.HasOne(h => h.ChemicalType)
            .WithMany()
            .HasForeignKey(h => h.ChemicalTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // 同一年度標準內，每個類型只能有一個危害性等級
        builder.HasIndex(h => new { h.SchemeId, h.ChemicalTypeId }).IsUnique();
    }
}
