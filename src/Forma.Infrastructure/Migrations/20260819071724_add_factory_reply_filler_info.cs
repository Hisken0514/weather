using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_reply_filler_info : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FillerContact",
                table: "FactoryReplies",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FillerName",
                table: "FactoryReplies",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FillerUnitName",
                table: "FactoryReplies",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FillerContact",
                table: "FactoryReplies");

            migrationBuilder.DropColumn(
                name: "FillerName",
                table: "FactoryReplies");

            migrationBuilder.DropColumn(
                name: "FillerUnitName",
                table: "FactoryReplies");
        }
    }
}
