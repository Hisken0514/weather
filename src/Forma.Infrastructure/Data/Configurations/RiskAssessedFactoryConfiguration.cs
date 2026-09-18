using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class RiskAssessedFactoryConfiguration : IEntityTypeConfiguration<RiskAssessedFactory>
{
    public void Configure(EntityTypeBuilder<RiskAssessedFactory> builder)
    {
        builder.ToTable("RiskAssessedFactories");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.FactoryRegistrationNo)
            .HasMaxLength(50);

        builder.Property(f => f.FactoryName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Address).HasMaxLength(500);
        builder.Property(f => f.IndustryCategory).HasMaxLength(100);
        builder.Property(f => f.IndustrialPark).HasMaxLength(100);
        builder.Property(f => f.Region).HasMaxLength(100);
        builder.Property(f => f.County).HasMaxLength(50);

        builder.HasIndex(f => f.FactoryRegistrationNo);
    }
}
