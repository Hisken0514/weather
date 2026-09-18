using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class restructure_agency_review_per_item_fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PenaltyAmount",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "ReinspectionDate",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "Result",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "ResultOtherText",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "ViolatedRegulation",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "WillPenalize",
                table: "AgencyReviews");

            migrationBuilder.DropColumn(
                name: "WillReinspect",
                table: "AgencyReviews");

            migrationBuilder.AddColumn<string>(
                name: "AgencyRemarks",
                table: "FactoryReplyItems",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PenaltyAmount",
                table: "FactoryReplyItems",
                type: "numeric(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReinspectionDate",
                table: "FactoryReplyItems",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Result",
                table: "FactoryReplyItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResultOtherText",
                table: "FactoryReplyItems",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ViolatedRegulation",
                table: "FactoryReplyItems",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WillPenalize",
                table: "FactoryReplyItems",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WillReinspect",
                table: "FactoryReplyItems",
                type: "boolean",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgencyRemarks",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "PenaltyAmount",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "ReinspectionDate",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "Result",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "ResultOtherText",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "ViolatedRegulation",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "WillPenalize",
                table: "FactoryReplyItems");

            migrationBuilder.DropColumn(
                name: "WillReinspect",
                table: "FactoryReplyItems");

            migrationBuilder.AddColumn<decimal>(
                name: "PenaltyAmount",
                table: "AgencyReviews",
                type: "numeric(12,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReinspectionDate",
                table: "AgencyReviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "AgencyReviews",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Result",
                table: "AgencyReviews",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResultOtherText",
                table: "AgencyReviews",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ViolatedRegulation",
                table: "AgencyReviews",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WillPenalize",
                table: "AgencyReviews",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WillReinspect",
                table: "AgencyReviews",
                type: "boolean",
                nullable: true);
        }
    }
}
