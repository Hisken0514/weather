using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_master : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FactoryMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FactoryRegistrationNo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FactoryName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UnifiedBusinessNo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    County = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Township = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OwnerName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OrganizationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    RegistrationStatus = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IndustryCategory = table.Column<string>(type: "text", nullable: true),
                    MainProducts = table.Column<string>(type: "text", nullable: true),
                    Lat = table.Column<double>(type: "double precision", nullable: true),
                    Lng = table.Column<double>(type: "double precision", nullable: true),
                    DataSource = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    LastImportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryMasters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FactoryMasters_County",
                table: "FactoryMasters",
                column: "County");

            migrationBuilder.CreateIndex(
                name: "IX_FactoryMasters_FactoryRegistrationNo",
                table: "FactoryMasters",
                column: "FactoryRegistrationNo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FactoryMasters");
        }
    }
}
