using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_risk_data_year : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FactoryRiskInputs_FactoryId",
                table: "FactoryRiskInputs");

            migrationBuilder.AddColumn<int>(
                name: "DataYear",
                table: "FactoryRiskInputs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryRiskInputs_FactoryId_DataYear",
                table: "FactoryRiskInputs",
                columns: new[] { "FactoryId", "DataYear" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FactoryRiskInputs_FactoryId_DataYear",
                table: "FactoryRiskInputs");

            migrationBuilder.DropColumn(
                name: "DataYear",
                table: "FactoryRiskInputs");

            migrationBuilder.CreateIndex(
                name: "IX_FactoryRiskInputs_FactoryId",
                table: "FactoryRiskInputs",
                column: "FactoryId",
                unique: true);
        }
    }
}
