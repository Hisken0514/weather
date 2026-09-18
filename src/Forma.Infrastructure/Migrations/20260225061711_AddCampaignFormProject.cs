using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignFormProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FormProjectId",
                table: "SupervisionCampaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionCampaigns_FormProjectId",
                table: "SupervisionCampaigns",
                column: "FormProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_SupervisionCampaigns_Projects_FormProjectId",
                table: "SupervisionCampaigns",
                column: "FormProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SupervisionCampaigns_Projects_FormProjectId",
                table: "SupervisionCampaigns");

            migrationBuilder.DropIndex(
                name: "IX_SupervisionCampaigns_FormProjectId",
                table: "SupervisionCampaigns");

            migrationBuilder.DropColumn(
                name: "FormProjectId",
                table: "SupervisionCampaigns");
        }
    }
}
