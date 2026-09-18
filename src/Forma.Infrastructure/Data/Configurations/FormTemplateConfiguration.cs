using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FormTemplateConfiguration : IEntityTypeConfiguration<FormTemplate>
{
    public void Configure(EntityTypeBuilder<FormTemplate> builder)
    {
        builder.ToTable("FormTemplates");

        builder.HasKey(ft => ft.Id);

        builder.Property(ft => ft.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ft => ft.Description)
            .HasMaxLength(2000);

        builder.Property(ft => ft.Category)
            .HasMaxLength(100);

        builder.Property(ft => ft.Schema)
            .IsRequired()
            .HasColumnType("jsonb");

        builder.Property(ft => ft.ThumbnailUrl)
            .HasMaxLength(500);

        // Relationships
        builder.HasOne(ft => ft.CreatedBy)
            .WithMany(u => u.CreatedTemplates)
            .HasForeignKey(ft => ft.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(ft => ft.Category);
        builder.HasIndex(ft => ft.IsPublic);
        builder.HasIndex(ft => ft.UsageCount);
    }
}
