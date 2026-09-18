using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class AddKpiItemLevelMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_NewDetailItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_OldDetailItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.AlterColumn<int>(
                name: "OldDetailItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "NewDetailItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "NewKpiItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OldKpiItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // 既有對照的 OldKpiItemId/NewKpiItemId 剛加欄位時預設是 0，會過不了下面要加的 FK，
            // 先從當初已經指定的 OldDetailItemId/NewDetailItemId 反查它們屬於哪個 KpiItem 回填。
            migrationBuilder.Sql(@"
                UPDATE m
                SET m.OldKpiItemId = od.KpiItemId
                FROM KpiDetailItemMappings m
                JOIN KpiDetailItems od ON od.Id = m.OldDetailItemId
                WHERE m.OldDetailItemId IS NOT NULL;

                UPDATE m
                SET m.NewKpiItemId = nd.KpiItemId
                FROM KpiDetailItemMappings m
                JOIN KpiDetailItems nd ON nd.Id = m.NewDetailItemId
                WHERE m.NewDetailItemId IS NOT NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_NewDetailItemId",
                table: "KpiDetailItemMappings",
                column: "NewDetailItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_NewKpiItemId",
                table: "KpiDetailItemMappings",
                column: "NewKpiItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_OldDetailItemId",
                table: "KpiDetailItemMappings",
                column: "OldDetailItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemMappings_OldKpiItemId",
                table: "KpiDetailItemMappings",
                column: "OldKpiItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_KpiDetailItemMappings_KpiItems_NewKpiItemId",
                table: "KpiDetailItemMappings",
                column: "NewKpiItemId",
                principalTable: "KpiItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_KpiDetailItemMappings_KpiItems_OldKpiItemId",
                table: "KpiDetailItemMappings",
                column: "OldKpiItemId",
                principalTable: "KpiItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KpiDetailItemMappings_KpiItems_NewKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropForeignKey(
                name: "FK_KpiDetailItemMappings_KpiItems_OldKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_NewDetailItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_NewKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_OldDetailItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropIndex(
                name: "IX_KpiDetailItemMappings_OldKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropColumn(
                name: "NewKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.DropColumn(
                name: "OldKpiItemId",
                table: "KpiDetailItemMappings");

            migrationBuilder.AlterColumn<int>(
                name: "OldDetailItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "NewDetailItemId",
                table: "KpiDetailItemMappings",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

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
    }
}
