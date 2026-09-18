using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class FidoCredentialConfiguration : IEntityTypeConfiguration<FidoCredential>
{
    public void Configure(EntityTypeBuilder<FidoCredential> builder)
    {
        builder.ToTable("FidoCredentials");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.CredentialId).IsRequired();
        builder.HasIndex(f => f.CredentialId).IsUnique();

        builder.Property(f => f.PublicKey).IsRequired();
        builder.Property(f => f.UserHandle).IsRequired();

        builder.Property(f => f.DeviceName).HasMaxLength(200);

        builder.HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.UserId);
    }
}
