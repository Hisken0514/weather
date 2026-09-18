using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class user_to_guid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SuggestFiles_UserInfoNames_UserInfoNameId",
                table: "SuggestFiles");

            migrationBuilder.DropIndex(
                name: "IX_SuggestFiles_UserInfoNameId",
                table: "SuggestFiles");

            migrationBuilder.DropColumn(
                name: "UserInfoNameId",
                table: "SuggestFiles");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "SuggestFiles",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SuggestFiles_UserId",
                table: "SuggestFiles",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_SuggestFiles_Users_UserId",
                table: "SuggestFiles",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SuggestFiles_Users_UserId",
                table: "SuggestFiles");

            migrationBuilder.DropIndex(
                name: "IX_SuggestFiles_UserId",
                table: "SuggestFiles");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "SuggestFiles");

            migrationBuilder.AddColumn<int>(
                name: "UserInfoNameId",
                table: "SuggestFiles",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SuggestFiles_UserInfoNameId",
                table: "SuggestFiles",
                column: "UserInfoNameId");

            migrationBuilder.AddForeignKey(
                name: "FK_SuggestFiles_UserInfoNames_UserInfoNameId",
                table: "SuggestFiles",
                column: "UserInfoNameId",
                principalTable: "UserInfoNames",
                principalColumn: "Id");
        }
    }
}
