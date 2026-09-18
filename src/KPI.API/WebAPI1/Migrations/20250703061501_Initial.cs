using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAPI1.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DataChangeLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TableName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RecordId = table.Column<int>(type: "int", nullable: false),
                    OperationType = table.Column<byte>(type: "tinyint", nullable: false),
                    NewData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModifiedBy = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ModifyDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataChangeLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "KpiCycles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CycleName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartYear = table.Column<int>(type: "int", nullable: false),
                    EndYear = table.Column<int>(type: "int", nullable: false),
                    CreateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UploadTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiCycles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "KpiFields",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    field = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    enfield = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiFields", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Menus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Lable = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Link = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<byte>(type: "tinyint", nullable: false),
                    MenuType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Menus", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrganizationTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TypeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CanHaveChildren = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SuggestEventTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestEventTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SuggestionTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestionTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserInfoNames",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    username = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    email = table.Column<string>(type: "varchar(max)", nullable: false),
                    password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EnterpriseId = table.Column<int>(type: "int", nullable: true),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    FactoryId = table.Column<int>(type: "int", nullable: true),
                    Auth = table.Column<byte>(type: "tinyint", nullable: false),
                    mobile = table.Column<string>(type: "varchar(40)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserInfoNames", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MenusRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MenuId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MenusRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MenusRoles_Menus_MenuId",
                        column: x => x.MenuId,
                        principalTable: "Menus",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OrganizationHierarchies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ParentTypeId = table.Column<int>(type: "int", nullable: false),
                    ChildTypeId = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    MaxChildren = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationHierarchies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationHierarchies_OrganizationTypes_ChildTypeId",
                        column: x => x.ChildTypeId,
                        principalTable: "OrganizationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrganizationHierarchies_OrganizationTypes_ParentTypeId",
                        column: x => x.ParentTypeId,
                        principalTable: "OrganizationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TypeId = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContactPerson = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ContactPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    TaxId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UseParentDomainVerification = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Organizations_OrganizationTypes_TypeId",
                        column: x => x.TypeId,
                        principalTable: "OrganizationTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Organizations_Organizations_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KpiItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IndicatorNumber = table.Column<int>(type: "int", nullable: false),
                    KpiCategoryId = table.Column<int>(type: "int", nullable: false),
                    KpiFieldId = table.Column<int>(type: "int", nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UploadTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiItems_KpiFields_KpiFieldId",
                        column: x => x.KpiFieldId,
                        principalTable: "KpiFields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KpiItems_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OrganizationDomains",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizationId = table.Column<int>(type: "int", nullable: false),
                    DomainName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    VerificationToken = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    IsSharedWithChildren = table.Column<bool>(type: "bit", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationDomains", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizationDomains_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SuggestDates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateTime>(type: "date", nullable: false),
                    SuggestEventTypeId = table.Column<int>(type: "int", nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestDates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SuggestDates_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SuggestDates_SuggestEventTypes_SuggestEventTypeId",
                        column: x => x.SuggestEventTypeId,
                        principalTable: "SuggestEventTypes",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SuggestFiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Quarter = table.Column<int>(type: "int", nullable: false),
                    ReportName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ReportType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    UserInfoNameId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SuggestFiles_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SuggestFiles_UserInfoNames_UserInfoNameId",
                        column: x => x.UserInfoNameId,
                        principalTable: "UserInfoNames",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(25)", maxLength: 25, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Nickname = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: false),
                    Mobile = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Position = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    EmailVerified = table.Column<bool>(type: "bit", nullable: false),
                    EmailVerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    VerificationToken = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TokenExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RegistrationDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PasswordPolicyId = table.Column<int>(type: "int", nullable: true),
                    PasswordChangedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PasswordExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ForceChangePassword = table.Column<bool>(type: "bit", nullable: false),
                    PasswordFailedAttempts = table.Column<int>(type: "int", nullable: false),
                    PasswordLockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastPasswordExpiryReminder = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrganizationTypeId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.UniqueConstraint("AK_Users_Email", x => x.Email);
                    table.ForeignKey(
                        name: "FK_Users_OrganizationTypes_OrganizationTypeId",
                        column: x => x.OrganizationTypeId,
                        principalTable: "OrganizationTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Users_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KpiDetailItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KpiItemId = table.Column<int>(type: "int", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ComparisonOperator = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    IsIndicator = table.Column<bool>(type: "bit", nullable: false),
                    CreateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UploadTime = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDetailItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiDetailItems_KpiItems_KpiItemId",
                        column: x => x.KpiItemId,
                        principalTable: "KpiItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KpiItemNames",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KpiItemId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartYear = table.Column<int>(type: "int", nullable: false),
                    EndYear = table.Column<int>(type: "int", nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiItemNames", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiItemNames_KpiItems_KpiItemId",
                        column: x => x.KpiItemId,
                        principalTable: "KpiItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KpiItemNames_Users_UserEmail",
                        column: x => x.UserEmail,
                        principalTable: "Users",
                        principalColumn: "Email",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SuggestReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SuggestDateId = table.Column<int>(type: "int", nullable: false),
                    SuggestionTypeId = table.Column<int>(type: "int", nullable: false),
                    SuggestionContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsAdopted = table.Column<byte>(type: "tinyint", nullable: true),
                    IsAdoptedOther = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RespDept = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImproveDetails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Manpower = table.Column<int>(type: "int", nullable: true),
                    Budget = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Completed = table.Column<byte>(type: "tinyint", nullable: true),
                    CompletedOther = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DoneYear = table.Column<int>(type: "int", nullable: true),
                    DoneMonth = table.Column<int>(type: "int", nullable: true),
                    ParallelExec = table.Column<byte>(type: "tinyint", nullable: true),
                    ParallelExecOther = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecPlan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remark = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KpiFieldId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SuggestReports_KpiFields_KpiFieldId",
                        column: x => x.KpiFieldId,
                        principalTable: "KpiFields",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SuggestReports_SuggestDates_SuggestDateId",
                        column: x => x.SuggestDateId,
                        principalTable: "SuggestDates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SuggestReports_SuggestionTypes_SuggestionTypeId",
                        column: x => x.SuggestionTypeId,
                        principalTable: "SuggestionTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SuggestReports_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRPasswordHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Salt = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StrengthScore = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRPasswordHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRPasswordHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KpiDatas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsApplied = table.Column<bool>(type: "bit", nullable: false),
                    BaselineYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BaselineValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    TargetValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DetailItemId = table.Column<int>(type: "int", nullable: false),
                    KpiCycleId = table.Column<int>(type: "int", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    ProductionSite = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDatas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiDatas_KpiCycles_KpiCycleId",
                        column: x => x.KpiCycleId,
                        principalTable: "KpiCycles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_KpiDatas_KpiDetailItems_DetailItemId",
                        column: x => x.DetailItemId,
                        principalTable: "KpiDetailItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KpiDatas_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "KpiDetailItemNames",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    KpiDetailItemId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartYear = table.Column<int>(type: "int", nullable: false),
                    EndYear = table.Column<int>(type: "int", nullable: true),
                    UserEmail = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiDetailItemNames", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiDetailItemNames_KpiDetailItems_KpiDetailItemId",
                        column: x => x.KpiDetailItemId,
                        principalTable: "KpiDetailItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KpiDetailItemNames_Users_UserEmail",
                        column: x => x.UserEmail,
                        principalTable: "Users",
                        principalColumn: "Email",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KpiReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Period = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    KpiReportValue = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    IsSkipped = table.Column<bool>(type: "bit", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<byte>(type: "tinyint", nullable: false),
                    KpiDataId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KpiReports_KpiDatas_KpiDataId",
                        column: x => x.KpiDataId,
                        principalTable: "KpiDatas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KpiDatas_DetailItemId",
                table: "KpiDatas",
                column: "DetailItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDatas_KpiCycleId",
                table: "KpiDatas",
                column: "KpiCycleId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDatas_OrganizationId",
                table: "KpiDatas",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemNames_KpiDetailItemId",
                table: "KpiDetailItemNames",
                column: "KpiDetailItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItemNames_UserEmail",
                table: "KpiDetailItemNames",
                column: "UserEmail");

            migrationBuilder.CreateIndex(
                name: "IX_KpiDetailItems_KpiItemId",
                table: "KpiDetailItems",
                column: "KpiItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiItemNames_KpiItemId",
                table: "KpiItemNames",
                column: "KpiItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiItemNames_UserEmail",
                table: "KpiItemNames",
                column: "UserEmail");

            migrationBuilder.CreateIndex(
                name: "IX_KpiItems_IndicatorNumber_KpiCategoryId_OrganizationId_KpiFieldId",
                table: "KpiItems",
                columns: new[] { "IndicatorNumber", "KpiCategoryId", "OrganizationId", "KpiFieldId" },
                unique: true,
                filter: "[OrganizationId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_KpiItems_KpiFieldId",
                table: "KpiItems",
                column: "KpiFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiItems_OrganizationId",
                table: "KpiItems",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiReports_KpiDataId",
                table: "KpiReports",
                column: "KpiDataId");

            migrationBuilder.CreateIndex(
                name: "IX_KpiReports_KpiDataId_Year_Period",
                table: "KpiReports",
                columns: new[] { "KpiDataId", "Year", "Period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MenusRoles_MenuId",
                table: "MenusRoles",
                column: "MenuId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationDomains_OrganizationId",
                table: "OrganizationDomains",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationHierarchies_ChildTypeId",
                table: "OrganizationHierarchies",
                column: "ChildTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationHierarchies_ParentTypeId_ChildTypeId",
                table: "OrganizationHierarchies",
                columns: new[] { "ParentTypeId", "ChildTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Code",
                table: "Organizations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_ParentId",
                table: "Organizations",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_TypeId",
                table: "Organizations",
                column: "TypeId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationTypes_TypeCode",
                table: "OrganizationTypes",
                column: "TypeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SuggestDates_OrganizationId",
                table: "SuggestDates",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestDates_SuggestEventTypeId",
                table: "SuggestDates",
                column: "SuggestEventTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestFiles_OrganizationId",
                table: "SuggestFiles",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestFiles_UserInfoNameId",
                table: "SuggestFiles",
                column: "UserInfoNameId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestReports_KpiFieldId",
                table: "SuggestReports",
                column: "KpiFieldId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestReports_SuggestDateId",
                table: "SuggestReports",
                column: "SuggestDateId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestReports_SuggestionTypeId",
                table: "SuggestReports",
                column: "SuggestionTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestReports_UserId",
                table: "SuggestReports",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId_RoleId",
                table: "UserRoles",
                columns: new[] { "UserId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRPasswordHistories_CreatedAt",
                table: "UserRPasswordHistories",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserRPasswordHistories_UserId_CreatedAt",
                table: "UserRPasswordHistories",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationTypeId",
                table: "Users",
                column: "OrganizationTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username_Email",
                table: "Users",
                columns: new[] { "Username", "Email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DataChangeLogs");

            migrationBuilder.DropTable(
                name: "KpiDetailItemNames");

            migrationBuilder.DropTable(
                name: "KpiItemNames");

            migrationBuilder.DropTable(
                name: "KpiReports");

            migrationBuilder.DropTable(
                name: "MenusRoles");

            migrationBuilder.DropTable(
                name: "OrganizationDomains");

            migrationBuilder.DropTable(
                name: "OrganizationHierarchies");

            migrationBuilder.DropTable(
                name: "SuggestFiles");

            migrationBuilder.DropTable(
                name: "SuggestReports");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "UserRPasswordHistories");

            migrationBuilder.DropTable(
                name: "KpiDatas");

            migrationBuilder.DropTable(
                name: "Menus");

            migrationBuilder.DropTable(
                name: "UserInfoNames");

            migrationBuilder.DropTable(
                name: "SuggestDates");

            migrationBuilder.DropTable(
                name: "SuggestionTypes");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "KpiCycles");

            migrationBuilder.DropTable(
                name: "KpiDetailItems");

            migrationBuilder.DropTable(
                name: "SuggestEventTypes");

            migrationBuilder.DropTable(
                name: "KpiItems");

            migrationBuilder.DropTable(
                name: "KpiFields");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropTable(
                name: "OrganizationTypes");
        }
    }
}
