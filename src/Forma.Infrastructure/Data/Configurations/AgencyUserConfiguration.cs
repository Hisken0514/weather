using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class AgencyUserConfiguration : IEntityTypeConfiguration<AgencyUser>
{
    public void Configure(EntityTypeBuilder<AgencyUser> builder)
    {
        builder.ToTable("AgencyUsers");

        builder.HasKey(au => au.Id);

        builder.HasOne(au => au.Agency)
            .WithMany(a => a.AgencyUsers)
            .HasForeignKey(au => au.AgencyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(au => au.User)
            .WithMany(u => u.AgencyMemberships)
            .HasForeignKey(au => au.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // 同一使用者不能重複綁定同一機關
        builder.HasIndex(au => new { au.AgencyId, au.UserId }).IsUnique();
    }
}
