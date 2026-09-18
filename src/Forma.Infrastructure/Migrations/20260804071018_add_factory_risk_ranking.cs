using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_risk_ranking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 先允許 null 加欄位，用每一列自己的 Id 回填成唯一值（不能用同一個空字串當預設值，
            // 這個標準底下只要原本就有兩個以上的指標，全部列都會撞同一個值，下面建唯一索引時
            // 就會失敗）。回填出來的 unmapped_xxx 只是暫時的佔位值，之後要到公式管理畫面把它
            // 改成真正對應的資料欄位名稱。
            migrationBuilder.AddColumn<string>(
                name: "CanonicalKey",
                table: "RiskIndicatorDefinitions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                @"UPDATE ""RiskIndicatorDefinitions"" SET ""CanonicalKey"" = 'unmapped_' || REPLACE(""Id""::text, '-', '') WHERE ""CanonicalKey"" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "CanonicalKey",
                table: "RiskIndicatorDefinitions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "RiskAssessedFactories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FactoryRegistrationNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FactoryName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IndustryCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IndustrialPark = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    County = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RiskAssessedFactories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FactoryRiskInputs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FactoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    MaxHazardChemicalTypeName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MaxHazardQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MaxHazardSubstanceName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryRiskInputs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FactoryRiskInputs_RiskAssessedFactories_FactoryId",
                        column: x => x.FactoryId,
                        principalTable: "RiskAssessedFactories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FactoryIndicatorValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FactoryRiskInputId = table.Column<Guid>(type: "uuid", nullable: false),
                    IndicatorCanonicalKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryIndicatorValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FactoryIndicatorValues_FactoryRiskInputs_FactoryRiskInputId",
                        column: x => x.FactoryRiskInputId,
                        principalTable: "FactoryRiskInputs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RiskIndicatorDefinitions_SchemeId_CanonicalKey",
                table: "RiskIndicatorDefinitions",
                columns: new[] { "SchemeId", "CanonicalKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryIndicatorValues_FactoryRiskInputId_IndicatorCanonica~",
                table: "FactoryIndicatorValues",
                columns: new[] { "FactoryRiskInputId", "IndicatorCanonicalKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryRiskInputs_FactoryId",
                table: "FactoryRiskInputs",
                column: "FactoryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RiskAssessedFactories_FactoryRegistrationNo",
                table: "RiskAssessedFactories",
                column: "FactoryRegistrationNo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FactoryIndicatorValues");

            migrationBuilder.DropTable(
                name: "FactoryRiskInputs");

            migrationBuilder.DropTable(
                name: "RiskAssessedFactories");

            migrationBuilder.DropIndex(
                name: "IX_RiskIndicatorDefinitions_SchemeId_CanonicalKey",
                table: "RiskIndicatorDefinitions");

            migrationBuilder.DropColumn(
                name: "CanonicalKey",
                table: "RiskIndicatorDefinitions");
        }
    }
}
