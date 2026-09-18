using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class UserIndustrialParkConfiguration : IEntityTypeConfiguration<UserIndustrialPark>
{
    public void Configure(EntityTypeBuilder<UserIndustrialPark> builder)
    {
        builder.ToTable("UserIndustrialParks");

        // Composite PK
        builder.HasKey(x => new { x.UserId, x.IndustrialParkName });

        builder.Property(x => x.IndustrialParkName)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasOne(x => x.User)
            .WithMany(u => u.IndustrialParks)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.UserId);
    }
}
