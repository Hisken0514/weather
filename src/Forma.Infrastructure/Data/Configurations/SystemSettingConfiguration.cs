using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

/// <summary>
/// 系統設定實體配置
/// </summary>
public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("SystemSettings");

        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.Category).IsUnique();

        builder.Property(x => x.Category)
            .IsRequired()
            .HasMaxLength(50);

        // 指定映射為 jsonb 類型 (PostgreSQL)
        builder.Property(x => x.Value)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(x => x.Description)
            .HasMaxLength(500);
    }
}
