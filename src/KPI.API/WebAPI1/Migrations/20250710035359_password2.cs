using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class password2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PasswordPolicy_OrganizationTypes_OrganizationTypeId",
                table: "PasswordPolicy");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordPolicy_Organizations_OrganizationId",
                table: "PasswordPolicy");

            migrationBuilder.CreateIndex(
                name: "IX_Users_PasswordPolicyId",
                table: "Users",
                column: "PasswordPolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordPolicy_IsDefault",
                table: "PasswordPolicy",
                column: "IsDefault");

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordPolicy_OrganizationTypes_OrganizationTypeId",
                table: "PasswordPolicy",
                column: "OrganizationTypeId",
                principalTable: "OrganizationTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordPolicy_Organizations_OrganizationId",
                table: "PasswordPolicy",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_PasswordPolicy_PasswordPolicyId",
                table: "Users",
                column: "PasswordPolicyId",
                principalTable: "PasswordPolicy",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PasswordPolicy_OrganizationTypes_OrganizationTypeId",
                table: "PasswordPolicy");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordPolicy_Organizations_OrganizationId",
                table: "PasswordPolicy");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_PasswordPolicy_PasswordPolicyId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_PasswordPolicyId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_PasswordPolicy_IsDefault",
                table: "PasswordPolicy");

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordPolicy_OrganizationTypes_OrganizationTypeId",
                table: "PasswordPolicy",
                column: "OrganizationTypeId",
                principalTable: "OrganizationTypes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordPolicy_Organizations_OrganizationId",
                table: "PasswordPolicy",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");
        }
    }
}
