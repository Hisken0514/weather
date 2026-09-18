using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class Cgange_DataLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "OperationType",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "RecordId",
                table: "DataChangeLogs");

            migrationBuilder.RenameColumn(
                name: "NewData",
                table: "DataChangeLogs",
                newName: "UserName");

            migrationBuilder.RenameColumn(
                name: "ModifyDate",
                table: "DataChangeLogs",
                newName: "OccurredAtUtc");

            migrationBuilder.AlterColumn<string>(
                name: "TableName",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "DataChangeLogs",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("SqlServer:Identity", "1, 1")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Action",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ClientIp",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntityId",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntityName",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PayloadJson",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestPath",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "DataChangeLogs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Action",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "ClientIp",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "EntityId",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "EntityName",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "PayloadJson",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "RequestPath",
                table: "DataChangeLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "DataChangeLogs");

            migrationBuilder.RenameColumn(
                name: "UserName",
                table: "DataChangeLogs",
                newName: "NewData");

            migrationBuilder.RenameColumn(
                name: "OccurredAtUtc",
                table: "DataChangeLogs",
                newName: "ModifyDate");

            migrationBuilder.AlterColumn<string>(
                name: "TableName",
                table: "DataChangeLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "DataChangeLogs",
                type: "int",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .Annotation("SqlServer:Identity", "1, 1")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                table: "DataChangeLogs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<byte>(
                name: "OperationType",
                table: "DataChangeLogs",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0);

            migrationBuilder.AddColumn<int>(
                name: "RecordId",
                table: "DataChangeLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
