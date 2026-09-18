using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryMasterConfiguration : IEntityTypeConfiguration<FactoryMaster>
{
    public void Configure(EntityTypeBuilder<FactoryMaster> builder)
    {
        builder.ToTable("FactoryMasters");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FactoryRegistrationNo).HasMaxLength(20).IsRequired();
        builder.Property(x => x.FactoryName).HasMaxLength(200).IsRequired();
        builder.Property(x => x.UnifiedBusinessNo).HasMaxLength(10);
        builder.Property(x => x.County).HasMaxLength(10);
        builder.Property(x => x.Township).HasMaxLength(20);
        builder.Property(x => x.OwnerName).HasMaxLength(50);
        builder.Property(x => x.OrganizationType).HasMaxLength(20);
        builder.Property(x => x.RegistrationStatus).HasMaxLength(50);
        builder.Property(x => x.DataSource).HasMaxLength(100);

        // 工廠登記編號建唯一索引，支援快速 upsert 查找
        builder.HasIndex(x => x.FactoryRegistrationNo).IsUnique();
        // 縣市索引，地圖查詢常用
        builder.HasIndex(x => x.County);
    }
}
