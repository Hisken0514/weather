using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class SupervisionCampaignConfiguration : IEntityTypeConfiguration<SupervisionCampaign>
{
    public void Configure(EntityTypeBuilder<SupervisionCampaign> builder)
    {
        builder.ToTable("SupervisionCampaigns");

        builder.HasKey(sc => sc.Id);

        builder.Property(sc => sc.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(sc => sc.Description)
            .HasMaxLength(1000);

        builder.Property(sc => sc.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(sc => sc.CreatedBy)
            .WithMany()
            .HasForeignKey(sc => sc.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(sc => sc.FormProject)
            .WithMany()
            .HasForeignKey(sc => sc.FormProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(sc => sc.Year);
        builder.HasIndex(sc => sc.Status);
    }
}
