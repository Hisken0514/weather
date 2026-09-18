using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class AddKpiDetailItemMappingGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropColumn(
                name: "CreatedByEmail",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "KpiDetailItemMappings");

            migrationBuilder.RenameColumn(
                name: "EffectiveYear",
                table: "KpiDetailItemMappings",
                newName: "GroupId");

            migrationBuilder.CreateTable(
                name: "KpiDetailItemMappingGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EffectiveYear = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedByEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDetailItemMappingGroups", x => x.Id);
                });

            // 既有對照資料還沒有分組（改版前沒有「群組」概念），先建一個預設群組承接，
            // 避免下面加 FK 時因為 GroupId 指不到任何群組而失敗。
            migrationBuilder.Sql(@"
                INSERT INTO KpiDetailItemMappingGroups (Name, EffectiveYear, Note, CreatedByEmail, CreatedAt)
                SELECT N'既有對照（升級時自動建立）', 113, N'資料庫升級時自動建立，用來承接舊版沒有分組的對照資料', 'system', GETUTCDATE()
                WHERE EXISTS (SELECT 1 FROM KpiDetailItemMappings);

                UPDATE m
                SET m.GroupId = g.Id
                FROM KpiDetailItemMappings m
                CROSS JOIN (SELECT TOP 1 Id FROM KpiDetailItemMappingGroups WHERE Name = N'既有對照（升級時自動建立）' ORDER BY Id DESC) g;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_GroupId",
                table: "KpiDetailItemMappings",
                column: "GroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_KpiDetailItemMappings_KpiDetailItemMappingGroups_GroupId",
                table: "KpiDetailItemMappings",
                column: "GroupId",
                principalTable: "KpiDetailItemMappingGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KpiDetailItemMappings_KpiDetailItemMappingGroups_GroupId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropTable(
                name: "KpiDetailItemMappingGroups");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_GroupId",
                table: "KpiDetailItemMappings");

            migrationBuilder.RenameColumn(
                name: "GroupId",
                table: "KpiDetailItemMappings",
                newName: "EffectiveYear");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "KpiDetailItemMappings",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedByEmail",
                table: "KpiDetailItemMappings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "KpiDetailItemMappings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }
    }
}
