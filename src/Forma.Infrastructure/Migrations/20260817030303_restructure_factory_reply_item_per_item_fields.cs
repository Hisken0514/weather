using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class restructure_factory_reply_item_per_item_fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletionDate",
                table: "FactoryReplies");

            migrationBuilder.DropColumn(
                name: "IsImprovementCompleted",
                table: "FactoryReplies");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "FactoryReplies");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletionDate",
                table: "FactoryReplyItems",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsImprovementCompleted",
                table: "FactoryReplyItems",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "FactoryReplyItems",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletionDate",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "IsImprovementCompleted",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "FactoryReplyItems");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletionDate",
                table: "FactoryReplies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsImprovementCompleted",
                table: "FactoryReplies",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "FactoryReplies",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }
    }
}
