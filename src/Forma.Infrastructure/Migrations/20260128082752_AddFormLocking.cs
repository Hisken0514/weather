using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFormLocking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "Forms",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockedAt",
                table: "Forms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LockedById",
                table: "Forms",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Forms_LockedById",
                table: "Forms",
                column: "LockedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Forms_Users_LockedById",
                table: "Forms",
                column: "LockedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Forms_Users_LockedById",
                table: "Forms");

            migrationBuilder.DropIndex(
                name: "IX_Forms_LockedById",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "LockedAt",
                table: "Forms");

            migrationBuilder.DropColumn(
                name: "LockedById",
                table: "Forms");
        }
    }
}
