using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentMcpEndpointOAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AuthType",
                table: "AgentMcpEndpoints",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OAuthAccessTokenEncrypted",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OAuthAccessTokenExpiresAt",
                table: "AgentMcpEndpoints",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthAuthorizationServer",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthClientId",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthClientSecretEncrypted",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OAuthConnectedAt",
                table: "AgentMcpEndpoints",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthRefreshTokenEncrypted",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthScope",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OAuthTokenType",
                table: "AgentMcpEndpoints",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuthType",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthAccessTokenEncrypted",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthAccessTokenExpiresAt",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthAuthorizationServer",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthClientId",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthClientSecretEncrypted",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthConnectedAt",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthRefreshTokenEncrypted",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthScope",
                table: "AgentMcpEndpoints");

            migrationBuilder.DropColumn(
                name: "OAuthTokenType",
                table: "AgentMcpEndpoints");
        }
    }
}
