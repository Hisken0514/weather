using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

/// <summary>
/// 匯出任務實體配置
/// </summary>
public class ExportConfiguration : IEntityTypeConfiguration<Export>
{
    public void Configure(EntityTypeBuilder<Export> builder)
    {
        builder.ToTable("Exports");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Format)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(e => e.Filters)
            .HasMaxLength(4000);

        builder.Property(e => e.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.FilePath)
            .HasMaxLength(1000);

        builder.Property(e => e.FileName)
            .HasMaxLength(500);

        builder.Property(e => e.ErrorMessage)
            .HasMaxLength(2000);

        builder.HasOne(e => e.Form)
            .WithMany()
            .HasForeignKey(e => e.FormId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.FormId);
        builder.HasIndex(e => e.CreatedById);
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.ExpiresAt);
    }
}
