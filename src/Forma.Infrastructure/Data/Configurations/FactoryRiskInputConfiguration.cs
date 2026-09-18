using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FactoryRiskInputConfiguration : IEntityTypeConfiguration<FactoryRiskInput>
{
    public void Configure(EntityTypeBuilder<FactoryRiskInput> builder)
    {
        builder.ToTable("FactoryRiskInputs");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.MaxHazardChemicalTypeName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(i => i.MaxHazardQuantity)
            .HasPrecision(18, 4);

        // 純文字紀錄、不參與計算，只是供事後追溯是哪個化學物質；真實資料常是完整的化學品
        // 組成清單（e.g. 混合溶劑逐項列出百分比），可能長達數百字，不設長度上限。
        builder.Property(i => i.MaxHazardSubstanceName);

        builder.HasOne(i => i.Factory)
            .WithMany(f => f.RiskInputs)
            .HasForeignKey(i => i.FactoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // 一家工廠、一個資料年度只留一份原始輸入值（重新匯入同一年度是覆蓋，不是新增；
        // 不同年度各自保留一份快照）
        builder.HasIndex(i => new { i.FactoryId, i.DataYear }).IsUnique();
    }
}
