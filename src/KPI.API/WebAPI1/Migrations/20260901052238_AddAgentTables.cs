using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgentConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentConversations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AgentDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    StoragePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    FailureReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UploadedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IndexedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentDocuments_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AgentLiteLlmSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BaseUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EmbeddingModel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ApiKeyEncrypted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaxOutputTokens = table.Column<int>(type: "int", nullable: false),
                    MaxToolCalls = table.Column<int>(type: "int", nullable: false),
                    StreamRequestBudgetSeconds = table.Column<double>(type: "float", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedByUserName = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentLiteLlmSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AgentMcpEndpoints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ApiKeyEncrypted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentMcpEndpoints", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AgentPromptSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SystemInstruction = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedByUserName = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentPromptSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AgentTools",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ToolKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Source = table.Column<int>(type: "int", nullable: false),
                    RiskTier = table.Column<int>(type: "int", nullable: false),
                    McpEndpointId = table.Column<int>(type: "int", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentTools", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AgentConversationMessages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ToolCallsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentConversationMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentConversationMessages_AgentConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AgentConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AgentToolRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ToolId = table.Column<int>(type: "int", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentToolRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentToolRoles_AgentTools_ToolId",
                        column: x => x.ToolId,
                        principalTable: "AgentTools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgentToolRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgentConversationMessages_ConversationId_CreatedAt",
                table: "AgentConversationMessages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AgentConversations_UserId",
                table: "AgentConversations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentDocuments_OrganizationId",
                table: "AgentDocuments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentDocuments_Status",
                table: "AgentDocuments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AgentToolRoles_RoleId",
                table: "AgentToolRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentToolRoles_ToolId_RoleId",
                table: "AgentToolRoles",
                columns: new[] { "ToolId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgentTools_ToolKey",
                table: "AgentTools",
                column: "ToolKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentConversationMessages");

            migrationBuilder.DropTable(
                name: "AgentDocuments");

            migrationBuilder.DropTable(
                name: "AgentLiteLlmSettings");

            migrationBuilder.DropTable(
                name: "AgentMcpEndpoints");

            migrationBuilder.DropTable(
                name: "AgentPromptSettings");

            migrationBuilder.DropTable(
                name: "AgentToolRoles");

            migrationBuilder.DropTable(
                name: "AgentConversations");

            migrationBuilder.DropTable(
                name: "AgentTools");
        }
    }
}
