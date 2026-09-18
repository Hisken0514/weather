using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class SupervisedFactoryConfiguration : IEntityTypeConfiguration<SupervisedFactory>
{
    public void Configure(EntityTypeBuilder<SupervisedFactory> builder)
    {
        builder.ToTable("SupervisedFactories");

        builder.HasKey(sf => sf.Id);

        builder.Property(sf => sf.FactoryName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(sf => sf.FactoryRegistrationNo)
            .HasMaxLength(50);

        builder.Property(sf => sf.FactoryAddress)
            .HasMaxLength(500);

        builder.Property(sf => sf.IndustryCategory)
            .HasMaxLength(100);

        builder.Property(sf => sf.IndustrialPark)
            .HasMaxLength(100);

        builder.Property(sf => sf.Region)
            .HasMaxLength(50);

        builder.Property(sf => sf.County)
            .HasMaxLength(50);

        builder.HasOne(sf => sf.Campaign)
            .WithMany(sc => sc.Factories)
            .HasForeignKey(sf => sf.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(sf => sf.CampaignId);
        builder.HasIndex(sf => sf.Region);
    }
}
