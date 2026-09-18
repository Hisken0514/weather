using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_risk_scoring_scheme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RiskScoringSchemes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RiskScoringSchemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RiskScoringSchemes_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HazardTypeLevels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChemicalType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    HazardLevel = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HazardTypeLevels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HazardTypeLevels_RiskScoringSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "RiskScoringSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuantityThresholds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChemicalType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    MinQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MaxQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuantityThresholds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuantityThresholds_RiskScoringSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "RiskScoringSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RiskScoringBands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Indicator = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MinValue = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    MaxValue = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Score = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RiskScoringBands", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RiskScoringBands_RiskScoringSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "RiskScoringSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HazardTypeLevels_SchemeId_ChemicalType",
                table: "HazardTypeLevels",
                columns: new[] { "SchemeId", "ChemicalType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuantityThresholds_SchemeId_ChemicalType_Level",
                table: "QuantityThresholds",
                columns: new[] { "SchemeId", "ChemicalType", "Level" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringBands_SchemeId_Indicator",
                table: "RiskScoringBands",
                columns: new[] { "SchemeId", "Indicator" });

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringSchemes_CreatedById",
                table: "RiskScoringSchemes",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringSchemes_IsActive",
                table: "RiskScoringSchemes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringSchemes_Year",
                table: "RiskScoringSchemes",
                column: "Year");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HazardTypeLevels");

            migrationBuilder.DropTable(
                name: "QuantityThresholds");

            migrationBuilder.DropTable(
                name: "RiskScoringBands");

            migrationBuilder.DropTable(
                name: "RiskScoringSchemes");
        }
    }
}
