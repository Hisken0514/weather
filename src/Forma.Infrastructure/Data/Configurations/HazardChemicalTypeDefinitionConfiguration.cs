using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class HazardChemicalTypeDefinitionConfiguration : IEntityTypeConfiguration<HazardChemicalTypeDefinition>
{
    public void Configure(EntityTypeBuilder<HazardChemicalTypeDefinition> builder)
    {
        builder.ToTable("HazardChemicalTypeDefinitions");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.MemberNames)
            .HasColumnType("text[]")
            .IsRequired()
            .HasDefaultValueSql("'{}'");

        builder.HasIndex(c => new { c.SchemeId, c.DisplayOrder });
    }
}
