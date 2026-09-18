using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectMemberRemovedById : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RemovedById",
                table: "ProjectMembers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_RemovedById",
                table: "ProjectMembers",
                column: "RemovedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectMembers_Users_RemovedById",
                table: "ProjectMembers",
                column: "RemovedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectMembers_Users_RemovedById",
                table: "ProjectMembers");

            migrationBuilder.DropIndex(
                name: "IX_ProjectMembers_RemovedById",
                table: "ProjectMembers");

            migrationBuilder.DropColumn(
                name: "RemovedById",
                table: "ProjectMembers");
        }
    }
}
