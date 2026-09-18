using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class EmailTemplateConfiguration : IEntityTypeConfiguration<EmailTemplate>
{
    public void Configure(EntityTypeBuilder<EmailTemplate> builder)
    {
        builder.ToTable("EmailTemplates");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.TemplateKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.Subject)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.HtmlContent)
            .IsRequired();

        builder.Property(e => e.AvailableVariables)
            .HasMaxLength(2000);

        builder.Property(e => e.TestVariables)
            .HasMaxLength(4000);

        builder.HasIndex(e => e.TemplateKey).IsUnique();
    }
}
