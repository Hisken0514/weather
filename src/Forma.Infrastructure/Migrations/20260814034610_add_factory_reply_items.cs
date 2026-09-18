using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_reply_items : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImprovementMeasures",
                table: "FactoryReplies");

            migrationBuilder.CreateTable(
                name: "FactoryReplyItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisionTaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ReplyText = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryReplyItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FactoryReplyItems_SupervisionTasks_SupervisionTaskId",
                        column: x => x.SupervisionTaskId,
                        principalTable: "SupervisionTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FactoryReplyItems_SupervisionTaskId",
                table: "FactoryReplyItems",
                column: "SupervisionTaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FactoryReplyItems");

            migrationBuilder.AddColumn<string>(
                name: "ImprovementMeasures",
                table: "FactoryReplies",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);
        }
    }
}
