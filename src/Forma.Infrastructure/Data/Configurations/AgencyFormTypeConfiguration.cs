using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class AgencyFormTypeConfiguration : IEntityTypeConfiguration<AgencyFormType>
{
    public void Configure(EntityTypeBuilder<AgencyFormType> builder)
    {
        builder.ToTable("AgencyFormTypes");

        builder.HasKey(aft => aft.Id);

        builder.Property(aft => aft.FormTypeName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasOne(aft => aft.Agency)
            .WithMany(a => a.FormTypes)
            .HasForeignKey(aft => aft.AgencyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(aft => aft.Form)
            .WithMany()
            .HasForeignKey(aft => aft.FormId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(aft => aft.AgencyId);
    }
}
