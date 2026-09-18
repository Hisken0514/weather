using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("Organizations");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(o => o.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(o => o.Description)
            .HasMaxLength(1000);

        builder.Property(o => o.Type)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Indexes
        builder.HasIndex(o => o.Code).IsUnique();
        builder.HasIndex(o => o.Name);
    }
}
