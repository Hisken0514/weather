using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class RiskIndicatorDefinitionConfiguration : IEntityTypeConfiguration<RiskIndicatorDefinition>
{
    public void Configure(EntityTypeBuilder<RiskIndicatorDefinition> builder)
    {
        builder.ToTable("RiskIndicatorDefinitions");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(i => i.CanonicalKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(i => i.Category)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(i => i.Description)
            .HasMaxLength(500);

        builder.Property(i => i.Weight)
            .HasDefaultValue(1);

        builder.Property(i => i.TreatMissingAsZero)
            .HasDefaultValue(false);

        builder.HasIndex(i => new { i.SchemeId, i.DisplayOrder });

        // 同一個 Scheme 底下，CanonicalKey 必須唯一，避免全台工廠風險排名比對資料時
        // 一個 CanonicalKey 對到兩個指標，不知道要套用哪一個。
        builder.HasIndex(i => new { i.SchemeId, i.CanonicalKey }).IsUnique();
    }
}
