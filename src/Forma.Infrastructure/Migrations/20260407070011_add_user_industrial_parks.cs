using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_user_industrial_parks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserIndustrialParks",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IndustrialParkName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserIndustrialParks", x => new { x.UserId, x.IndustrialParkName });
                    table.ForeignKey(
                        name: "FK_UserIndustrialParks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserIndustrialParks_UserId",
                table: "UserIndustrialParks",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserIndustrialParks");
        }
    }
}
