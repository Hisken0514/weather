using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSupervision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Agencies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Region = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agencies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SupervisionCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupervisionCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupervisionCampaigns_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AgencyFormTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AgencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    FormTypeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FormId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgencyFormTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgencyFormTypes_Agencies_AgencyId",
                        column: x => x.AgencyId,
                        principalTable: "Agencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgencyFormTypes_Forms_FormId",
                        column: x => x.FormId,
                        principalTable: "Forms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "AgencyUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AgencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgencyUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgencyUsers_Agencies_AgencyId",
                        column: x => x.AgencyId,
                        principalTable: "Agencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgencyUsers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupervisedFactories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    RiskRank = table.Column<int>(type: "integer", nullable: true),
                    FactoryRegistrationNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FactoryName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FactoryAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IndustryCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IndustrialPark = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Region = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    County = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupervisedFactories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupervisedFactories_SupervisionCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "SupervisionCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupervisionTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupervisedFactoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    FormId = table.Column<Guid>(type: "uuid", nullable: true),
                    FormTypeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubmissionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupervisionTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupervisionTasks_Agencies_AgencyId",
                        column: x => x.AgencyId,
                        principalTable: "Agencies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupervisionTasks_FormSubmissions_SubmissionId",
                        column: x => x.SubmissionId,
                        principalTable: "FormSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupervisionTasks_Forms_FormId",
                        column: x => x.FormId,
                        principalTable: "Forms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SupervisionTasks_SupervisedFactories_SupervisedFactoryId",
                        column: x => x.SupervisedFactoryId,
                        principalTable: "SupervisedFactories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Agencies_IsActive",
                table: "Agencies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Agencies_Name",
                table: "Agencies",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgencyFormTypes_AgencyId",
                table: "AgencyFormTypes",
                column: "AgencyId");

            migrationBuilder.CreateIndex(
                name: "IX_AgencyFormTypes_FormId",
                table: "AgencyFormTypes",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_AgencyUsers_AgencyId_UserId",
                table: "AgencyUsers",
                columns: new[] { "AgencyId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgencyUsers_UserId",
                table: "AgencyUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisedFactories_CampaignId",
                table: "SupervisedFactories",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisedFactories_Region",
                table: "SupervisedFactories",
                column: "Region");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionCampaigns_CreatedById",
                table: "SupervisionCampaigns",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionCampaigns_Status",
                table: "SupervisionCampaigns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionCampaigns_Year",
                table: "SupervisionCampaigns",
                column: "Year");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionTasks_AgencyId",
                table: "SupervisionTasks",
                column: "AgencyId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionTasks_FormId",
                table: "SupervisionTasks",
                column: "FormId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionTasks_Status",
                table: "SupervisionTasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionTasks_SubmissionId",
                table: "SupervisionTasks",
                column: "SubmissionId");

            migrationBuilder.CreateIndex(
                name: "IX_SupervisionTasks_SupervisedFactoryId",
                table: "SupervisionTasks",
                column: "SupervisedFactoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgencyFormTypes");

            migrationBuilder.DropTable(
                name: "AgencyUsers");

            migrationBuilder.DropTable(
                name: "SupervisionTasks");

            migrationBuilder.DropTable(
                name: "Agencies");

            migrationBuilder.DropTable(
                name: "SupervisedFactories");

            migrationBuilder.DropTable(
                name: "SupervisionCampaigns");
        }
    }
}
