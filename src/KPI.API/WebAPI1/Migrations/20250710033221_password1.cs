using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class password1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PasswordPolicy",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    OrganizationTypeId = table.Column<int>(type: "int", nullable: true),
                    MinLength = table.Column<int>(type: "int", nullable: false),
                    MaxLength = table.Column<int>(type: "int", nullable: false),
                    RequireUppercase = table.Column<bool>(type: "bit", nullable: false),
                    RequireLowercase = table.Column<bool>(type: "bit", nullable: false),
                    RequireNumber = table.Column<bool>(type: "bit", nullable: false),
                    RequireSpecialChar = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHistoryCount = table.Column<int>(type: "int", nullable: false),
                    PasswordExpiryDays = table.Column<int>(type: "int", nullable: false),
                    PasswordExpiryWarningDays = table.Column<int>(type: "int", nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    AllowUserOverride = table.Column<bool>(type: "bit", nullable: false),
                    SpecialChars = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MinUniqueChars = table.Column<int>(type: "int", nullable: false),
                    PreventCommonWords = table.Column<bool>(type: "bit", nullable: false),
                    PreventUsernameInclusion = table.Column<bool>(type: "bit", nullable: false),
                    LockoutThreshold = table.Column<int>(type: "int", nullable: false),
                    LockoutDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordPolicy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordPolicy_OrganizationTypes_OrganizationTypeId",
                        column: x => x.OrganizationTypeId,
                        principalTable: "OrganizationTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PasswordPolicy_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordPolicy_OrganizationId",
                table: "PasswordPolicy",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordPolicy_OrganizationTypeId",
                table: "PasswordPolicy",
                column: "OrganizationTypeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PasswordPolicy");
        }
    }
}
