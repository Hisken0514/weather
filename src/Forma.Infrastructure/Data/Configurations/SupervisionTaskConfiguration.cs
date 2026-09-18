using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Forma.Infrastructure.Data.Configurations;

public class SupervisionTaskConfiguration : IEntityTypeConfiguration<SupervisionTask>
{
    public void Configure(EntityTypeBuilder<SupervisionTask> builder)
    {
        builder.ToTable("SupervisionTasks");

        builder.HasKey(st => st.Id);

        builder.Property(st => st.FormTypeName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(st => st.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(st => st.Factory)
            .WithMany(sf => sf.Tasks)
            .HasForeignKey(st => st.SupervisedFactoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(st => st.Agency)
            .WithMany(a => a.SupervisionTasks)
            .HasForeignKey(st => st.AgencyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(st => st.Form)
            .WithMany()
            .HasForeignKey(st => st.FormId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(st => st.Submission)
            .WithMany()
            .HasForeignKey(st => st.SubmissionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(st => st.SupervisedFactoryId);
        builder.HasIndex(st => st.AgencyId);
        builder.HasIndex(st => st.Status);
    }
}
