using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class add_mail_logs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MailLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Receivers = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReceiverCount = table.Column<int>(type: "int", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MailType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsSuccess = table.Column<bool>(type: "bit", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MessageId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    BounceStatus = table.Column<int>(type: "int", nullable: false),
                    BounceReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BounceAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BounceCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RemoteMta = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MailLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MailLogs_MessageId",
                table: "MailLogs",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MailLogs_SentAtUtc",
                table: "MailLogs",
                column: "SentAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MailLogs");
        }
    }
}
