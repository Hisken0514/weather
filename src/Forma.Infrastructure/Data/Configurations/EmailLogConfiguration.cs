using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class EmailLogConfiguration : IEntityTypeConfiguration<EmailLog>
{
    public void Configure(EntityTypeBuilder<EmailLog> builder)
    {
        builder.ToTable("EmailLogs");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .UseIdentityColumn();

        builder.Property(e => e.RecipientEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(e => e.RecipientName)
            .HasMaxLength(200);

        builder.Property(e => e.Subject)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.TemplateKey)
            .HasMaxLength(100);

        builder.Property(e => e.ErrorMessage)
            .HasMaxLength(2000);

        builder.Property(e => e.UserId)
            .HasMaxLength(100);

        builder.Property(e => e.UserName)
            .HasMaxLength(200);

        builder.HasIndex(e => e.SentAt);
        builder.HasIndex(e => e.IsSuccess);
        builder.HasIndex(e => e.TemplateKey);
        builder.HasIndex(e => e.RecipientEmail);
    }
}
