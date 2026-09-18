using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class AddKpiDetailItemMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KpiDetailItemMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OldDetailItemId = table.Column<int>(type: "int", nullable: false),
                    NewDetailItemId = table.Column<int>(type: "int", nullable: false),
                    EffectiveYear = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedByEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDetailItemMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiDetailItemMappings_KpiDetailItems_NewDetailItemId",
                        column: x => x.NewDetailItemId,
                        principalTable: "KpiDetailItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_KpiDetailItemMappings_KpiDetailItems_OldDetailItemId",
                        column: x => x.OldDetailItemId,
                        principalTable: "KpiDetailItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_NewDetailItemId",
                table: "KpiDetailItemMappings",
                column: "NewDetailItemId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_OldDetailItemId",
                table: "KpiDetailItemMappings",
                column: "OldDetailItemId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KpiDetailItemMappings");
        }
    }
}
