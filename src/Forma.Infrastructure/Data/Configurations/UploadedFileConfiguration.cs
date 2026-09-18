using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

/// <summary>
/// 上傳檔案實體配置
/// </summary>
public class UploadedFileConfiguration : IEntityTypeConfiguration<UploadedFile>
{
    public void Configure(EntityTypeBuilder<UploadedFile> builder)
    {
        builder.ToTable("UploadedFiles");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.OriginalFileName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(f => f.StoredFileName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(f => f.FilePath)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(f => f.ContentType)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.FileSize)
            .IsRequired();

        builder.Property(f => f.FileHash)
            .IsRequired()
            .HasMaxLength(64); // SHA256 hex string

        builder.Property(f => f.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(f => f.Description)
            .HasMaxLength(2000);

        builder.Property(f => f.EntityType)
            .HasMaxLength(100);

        builder.HasOne(f => f.Uploader)
            .WithMany(u => u.UploadedFiles)
            .HasForeignKey(f => f.UploaderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(f => f.UploaderId);
        builder.HasIndex(f => f.Status);
        builder.HasIndex(f => f.ContentType);
        builder.HasIndex(f => f.EntityType);
        builder.HasIndex(f => f.EntityId);
        builder.HasIndex(f => f.FileHash);
        builder.HasIndex(f => f.CreatedAt);
        builder.HasIndex(f => f.ExpiresAt);

        // Composite index for entity lookups
        builder.HasIndex(f => new { f.EntityType, f.EntityId });
    }
}
