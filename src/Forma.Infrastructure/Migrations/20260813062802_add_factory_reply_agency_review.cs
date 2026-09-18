using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class add_factory_reply_agency_review : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgencyReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisionTaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    WillReinspect = table.Column<bool>(type: "boolean", nullable: true),
                    ReinspectionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Result = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ResultOtherText = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    WillPenalize = table.Column<bool>(type: "boolean", nullable: true),
                    ViolatedRegulation = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PenaltyAmount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    Remarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ReviewerAgencyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ReviewerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReviewerContact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgencyReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgencyReviews_SupervisionTasks_SupervisionTaskId",
                        column: x => x.SupervisionTaskId,
                        principalTable: "SupervisionTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgencyReviews_Users_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "AgencyReviewTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisionCampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AccessCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgencyReviewTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgencyReviewTokens_Agencies_AgencyId",
                        column: x => x.AgencyId,
                        principalTable: "Agencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AgencyReviewTokens_SupervisionCampaigns_SupervisionCampaign~",
                        column: x => x.SupervisionCampaignId,
                        principalTable: "SupervisionCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FactoryReplies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisionTaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImprovementMeasures = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    IsImprovementCompleted = table.Column<bool>(type: "boolean", nullable: true),
                    CompletionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Remarks = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryReplies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FactoryReplies_SupervisionTasks_SupervisionTaskId",
                        column: x => x.SupervisionTaskId,
                        principalTable: "SupervisionTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FactoryReplyTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisedFactoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastAccessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AccessCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryReplyTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FactoryReplyTokens_SupervisedFactories_SupervisedFactoryId",
                        column: x => x.SupervisedFactoryId,
                        principalTable: "SupervisedFactories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgencyReviews_SubmittedByUserId",
                table: "AgencyReviews",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AgencyReviews_SupervisionTaskId",
                table: "AgencyReviews",
                column: "SupervisionTaskId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgencyReviewTokens_AgencyId",
                table: "AgencyReviewTokens",
                column: "AgencyId");

            migrationBuilder.CreateIndex(
                name: "IX_AgencyReviewTokens_SupervisionCampaignId_AgencyId",
                table: "AgencyReviewTokens",
                columns: new[] { "SupervisionCampaignId", "AgencyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgencyReviewTokens_Token",
                table: "AgencyReviewTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryReplies_SupervisionTaskId",
                table: "FactoryReplies",
                column: "SupervisionTaskId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryReplyTokens_SupervisedFactoryId",
                table: "FactoryReplyTokens",
                column: "SupervisedFactoryId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactoryReplyTokens_Token",
                table: "FactoryReplyTokens",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgencyReviews");

            migrationBuilder.DropTable(
                name: "AgencyReviewTokens");

            migrationBuilder.DropTable(
                name: "FactoryReplies");

            migrationBuilder.DropTable(
                name: "FactoryReplyTokens");
        }
    }
}
