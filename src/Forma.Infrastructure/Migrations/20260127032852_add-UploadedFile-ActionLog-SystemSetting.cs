using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class addUploadedFileActionLogSystemSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActionLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ActionName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsSuccess = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ExecutionDuration = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Value = table.Column<string>(type: "jsonb", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UploadedFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StoredFileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    FileHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    UploaderId = table.Column<Guid>(type: "uuid", nullable: false),
                    DownloadCount = table.Column<int>(type: "integer", nullable: false),
                    LastDownloadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UploadedFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UploadedFiles_Users_UploaderId",
                        column: x => x.UploaderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActionLogs_ActionType",
                table: "ActionLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_ActionLogs_CreatedAt",
                table: "ActionLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ActionLogs_EntityType",
                table: "ActionLogs",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_ActionLogs_IsSuccess",
                table: "ActionLogs",
                column: "IsSuccess");

            migrationBuilder.CreateIndex(
                name: "IX_ActionLogs_UserId",
                table: "ActionLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_Category",
                table: "SystemSettings",
                column: "Category",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_ContentType",
                table: "UploadedFiles",
                column: "ContentType");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_CreatedAt",
                table: "UploadedFiles",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_EntityId",
                table: "UploadedFiles",
                column: "EntityId");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_EntityType",
                table: "UploadedFiles",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_EntityType_EntityId",
                table: "UploadedFiles",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_ExpiresAt",
                table: "UploadedFiles",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_FileHash",
                table: "UploadedFiles",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_Status",
                table: "UploadedFiles",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UploadedFiles_UploaderId",
                table: "UploadedFiles",
                column: "UploaderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActionLogs");

            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropTable(
                name: "UploadedFiles");
        }
    }
}
