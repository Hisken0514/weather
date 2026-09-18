using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class RiskScoringSchemeConfiguration : IEntityTypeConfiguration<RiskScoringScheme>
{
    public void Configure(EntityTypeBuilder<RiskScoringScheme> builder)
    {
        builder.ToTable("RiskScoringSchemes");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.HazardQuantityMatrixWeight)
            .HasDefaultValue(1);

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Indicators)
            .WithOne(i => i.Scheme)
            .HasForeignKey(i => i.SchemeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.ChemicalTypes)
            .WithOne(c => c.Scheme)
            .HasForeignKey(c => c.SchemeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Bands)
            .WithOne(b => b.Scheme)
            .HasForeignKey(b => b.SchemeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.HazardTypeLevels)
            .WithOne(h => h.Scheme)
            .HasForeignKey(h => h.SchemeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.QuantityThresholds)
            .WithOne(q => q.Scheme)
            .HasForeignKey(q => q.SchemeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.Year);
        builder.HasIndex(s => s.IsActive);
    }
}
