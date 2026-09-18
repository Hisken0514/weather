using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class customize_risk_scoring_indicators_and_chemical_types : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 這支 migration 把原本寫死在 RiskIndicator/HazardChemicalType enum 裡的 6 個指標、
            // 7 個化學品類型改成每個年度標準（RiskScoringScheme）各自獨立、可自由新增/刪除的資料表。
            // 既有資料（RiskScoringBands.Indicator / HazardTypeLevels.ChemicalType / QuantityThresholds.ChemicalType
            // 這些字串欄位）必須原地轉換成新的 Guid 外鍵，不能直接砍欄位重建，故手動改寫成以下順序：
            // 1) 建新表 → 2) 幫既有 scheme 各自 seed 固定的 6+7 筆定義 → 3) 加 nullable FK 欄位
            // → 4) 用 SchemeId+DisplayOrder 回填 → 5) 安全網檢查 → 6) 改 NOT NULL → 7) 刪舊欄位/索引 → 8) 新索引/FK。

            // ── 1) 建立新表 ────────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "HazardChemicalTypeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HazardChemicalTypeDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HazardChemicalTypeDefinitions_RiskScoringSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "RiskScoringSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RiskIndicatorDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RiskIndicatorDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RiskIndicatorDefinitions_RiskScoringSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "RiskScoringSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 2) 幫每一筆既有的年度標準各自 seed 固定的 6 個指標、7 個化學品類型 ──────────
            // DisplayOrder 對應原本 enum 的宣告順序，後面步驟 4 的回填靠這個位置編號比對，
            // 不重打一次中文名稱，避免兩處字串不一致悄悄漏掉資料。
            migrationBuilder.Sql(@"
                INSERT INTO ""RiskIndicatorDefinitions"" (""Id"", ""SchemeId"", ""Name"", ""Category"", ""Description"", ""DisplayOrder"")
                SELECT gen_random_uuid(), s.""Id"", v.name, v.category, v.description, v.display_order
                FROM ""RiskScoringSchemes"" s
                CROSS JOIN (VALUES
                    ('工廠年齡（年）', 'Severity', NULL, 0),
                    ('危險品運作分布總數量', 'Severity', NULL, 1),
                    ('危險品運作類型數', 'Severity', NULL, 2),
                    ('近三年火災爆炸件數', 'Probability', NULL, 3),
                    ('近三年職業災害件數', 'Probability', NULL, 4),
                    ('前次督導結果', 'Probability', '0=均已改善，1=未全部改善，2=未曾納入督導', 5)
                ) AS v(name, category, description, display_order);
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""HazardChemicalTypeDefinitions"" (""Id"", ""SchemeId"", ""Name"", ""DisplayOrder"")
                SELECT gen_random_uuid(), s.""Id"", v.name, v.display_order
                FROM ""RiskScoringSchemes"" s
                CROSS JOIN (VALUES
                    ('易燃固體', 0),
                    ('易燃液體', 1),
                    ('氧化性固體', 2),
                    ('氧化性液體', 3),
                    ('可燃性高壓氣體', 4),
                    ('發火性／禁水性物質', 5),
                    ('自反應物質／有機過氧化物', 6)
                ) AS v(name, display_order);
            ");

            // ── 3) 加 nullable 的新 FK 欄位（先不設 NOT NULL，等回填完再收緊） ────────────
            migrationBuilder.AddColumn<Guid>(
                name: "IndicatorId",
                table: "RiskScoringBands",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Label",
                table: "RiskScoringBands",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ChemicalTypeId",
                table: "QuantityThresholds",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ChemicalTypeId",
                table: "HazardTypeLevels",
                type: "uuid",
                nullable: true);

            // ── 4) 回填：用 SchemeId + DisplayOrder（固定位置編號）比對舊 enum 字串 ──────────
            migrationBuilder.Sql(@"
                UPDATE ""RiskScoringBands"" b
                SET ""IndicatorId"" = d.""Id""
                FROM ""RiskIndicatorDefinitions"" d
                WHERE d.""SchemeId"" = b.""SchemeId""
                  AND d.""DisplayOrder"" = CASE b.""Indicator""
                        WHEN 'FactoryAge' THEN 0
                        WHEN 'HazardDistributionCount' THEN 1
                        WHEN 'HazardTypeCount' THEN 2
                        WHEN 'FireExplosionCount' THEN 3
                        WHEN 'OccupationalDisaster' THEN 4
                        WHEN 'AuditResult' THEN 5
                      END;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""HazardTypeLevels"" h
                SET ""ChemicalTypeId"" = d.""Id""
                FROM ""HazardChemicalTypeDefinitions"" d
                WHERE d.""SchemeId"" = h.""SchemeId""
                  AND d.""DisplayOrder"" = CASE h.""ChemicalType""
                        WHEN 'FlammableSolid' THEN 0
                        WHEN 'FlammableLiquid' THEN 1
                        WHEN 'OxidizingSolid' THEN 2
                        WHEN 'OxidizingLiquid' THEN 3
                        WHEN 'FlammableCompressedGas' THEN 4
                        WHEN 'PyrophoricOrWaterReactive' THEN 5
                        WHEN 'SelfReactiveOrOrganicPeroxide' THEN 6
                      END;
            ");

            migrationBuilder.Sql(@"
                UPDATE ""QuantityThresholds"" q
                SET ""ChemicalTypeId"" = d.""Id""
                FROM ""HazardChemicalTypeDefinitions"" d
                WHERE d.""SchemeId"" = q.""SchemeId""
                  AND d.""DisplayOrder"" = CASE q.""ChemicalType""
                        WHEN 'FlammableSolid' THEN 0
                        WHEN 'FlammableLiquid' THEN 1
                        WHEN 'OxidizingSolid' THEN 2
                        WHEN 'OxidizingLiquid' THEN 3
                        WHEN 'FlammableCompressedGas' THEN 4
                        WHEN 'PyrophoricOrWaterReactive' THEN 5
                        WHEN 'SelfReactiveOrOrganicPeroxide' THEN 6
                      END;
            ");

            // ── 5) 安全網：回填後不該有漏網之魚，寧可讓 migration 早點大聲失敗 ──────────
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM ""RiskScoringBands"" WHERE ""IndicatorId"" IS NULL)
                     OR EXISTS (SELECT 1 FROM ""HazardTypeLevels"" WHERE ""ChemicalTypeId"" IS NULL)
                     OR EXISTS (SELECT 1 FROM ""QuantityThresholds"" WHERE ""ChemicalTypeId"" IS NULL)
                  THEN
                    RAISE EXCEPTION 'risk-scoring backfill failed: unmapped rows remain';
                  END IF;
                END $$;
            ");

            // ── 6) 回填完成，收緊為 NOT NULL ────────────────────────────────────
            migrationBuilder.AlterColumn<Guid>(
                name: "IndicatorId",
                table: "RiskScoringBands",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ChemicalTypeId",
                table: "QuantityThresholds",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ChemicalTypeId",
                table: "HazardTypeLevels",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            // ── 7) 刪掉舊索引與舊的 enum 字串欄位 ─────────────────────────────────
            migrationBuilder.DropIndex(
                name: "IX_RiskScoringBands_SchemeId_Indicator",
                table: "RiskScoringBands");

            migrationBuilder.DropIndex(
                name: "IX_QuantityThresholds_SchemeId_ChemicalType_Level",
                table: "QuantityThresholds");

            migrationBuilder.DropIndex(
                name: "IX_HazardTypeLevels_SchemeId_ChemicalType",
                table: "HazardTypeLevels");

            migrationBuilder.DropColumn(
                name: "Indicator",
                table: "RiskScoringBands");

            migrationBuilder.DropColumn(
                name: "ChemicalType",
                table: "QuantityThresholds");

            migrationBuilder.DropColumn(
                name: "ChemicalType",
                table: "HazardTypeLevels");

            // ── 8) 新索引與外鍵 ────────────────────────────────────────────────
            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringBands_IndicatorId",
                table: "RiskScoringBands",
                column: "IndicatorId");

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringBands_SchemeId_IndicatorId",
                table: "RiskScoringBands",
                columns: new[] { "SchemeId", "IndicatorId" });

            migrationBuilder.CreateIndex(
                name: "IX_QuantityThresholds_ChemicalTypeId",
                table: "QuantityThresholds",
                column: "ChemicalTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_QuantityThresholds_SchemeId_ChemicalTypeId_Level",
                table: "QuantityThresholds",
                columns: new[] { "SchemeId", "ChemicalTypeId", "Level" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HazardTypeLevels_ChemicalTypeId",
                table: "HazardTypeLevels",
                column: "ChemicalTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_HazardTypeLevels_SchemeId_ChemicalTypeId",
                table: "HazardTypeLevels",
                columns: new[] { "SchemeId", "ChemicalTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HazardChemicalTypeDefinitions_SchemeId_DisplayOrder",
                table: "HazardChemicalTypeDefinitions",
                columns: new[] { "SchemeId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_RiskIndicatorDefinitions_SchemeId_DisplayOrder",
                table: "RiskIndicatorDefinitions",
                columns: new[] { "SchemeId", "DisplayOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_HazardTypeLevels_HazardChemicalTypeDefinitions_ChemicalType~",
                table: "HazardTypeLevels",
                column: "ChemicalTypeId",
                principalTable: "HazardChemicalTypeDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuantityThresholds_HazardChemicalTypeDefinitions_ChemicalTy~",
                table: "QuantityThresholds",
                column: "ChemicalTypeId",
                principalTable: "HazardChemicalTypeDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RiskScoringBands_RiskIndicatorDefinitions_IndicatorId",
                table: "RiskScoringBands",
                column: "IndicatorId",
                principalTable: "RiskIndicatorDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 注意：無法完全安全地還原。若使用者在升級後已經新增/刪除/改名過指標或化學品類型，
            // 這些客製化資訊在回滾時會遺失（舊的 enum 字串欄位只能還原成空字串佔位）。
            migrationBuilder.DropForeignKey(
                name: "FK_HazardTypeLevels_HazardChemicalTypeDefinitions_ChemicalType~",
                table: "HazardTypeLevels");

            migrationBuilder.DropForeignKey(
                name: "FK_QuantityThresholds_HazardChemicalTypeDefinitions_ChemicalTy~",
                table: "QuantityThresholds");

            migrationBuilder.DropForeignKey(
                name: "FK_RiskScoringBands_RiskIndicatorDefinitions_IndicatorId",
                table: "RiskScoringBands");

            migrationBuilder.DropTable(
                name: "HazardChemicalTypeDefinitions");

            migrationBuilder.DropTable(
                name: "RiskIndicatorDefinitions");

            migrationBuilder.DropIndex(
                name: "IX_RiskScoringBands_IndicatorId",
                table: "RiskScoringBands");

            migrationBuilder.DropIndex(
                name: "IX_RiskScoringBands_SchemeId_IndicatorId",
                table: "RiskScoringBands");

            migrationBuilder.DropIndex(
                name: "IX_QuantityThresholds_ChemicalTypeId",
                table: "QuantityThresholds");

            migrationBuilder.DropIndex(
                name: "IX_QuantityThresholds_SchemeId_ChemicalTypeId_Level",
                table: "QuantityThresholds");

            migrationBuilder.DropIndex(
                name: "IX_HazardTypeLevels_ChemicalTypeId",
                table: "HazardTypeLevels");

            migrationBuilder.DropIndex(
                name: "IX_HazardTypeLevels_SchemeId_ChemicalTypeId",
                table: "HazardTypeLevels");

            migrationBuilder.DropColumn(
                name: "IndicatorId",
                table: "RiskScoringBands");

            migrationBuilder.DropColumn(
                name: "Label",
                table: "RiskScoringBands");

            migrationBuilder.DropColumn(
                name: "ChemicalTypeId",
                table: "QuantityThresholds");

            migrationBuilder.DropColumn(
                name: "ChemicalTypeId",
                table: "HazardTypeLevels");

            migrationBuilder.AddColumn<string>(
                name: "Indicator",
                table: "RiskScoringBands",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChemicalType",
                table: "QuantityThresholds",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChemicalType",
                table: "HazardTypeLevels",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_RiskScoringBands_SchemeId_Indicator",
                table: "RiskScoringBands",
                columns: new[] { "SchemeId", "Indicator" });

            migrationBuilder.CreateIndex(
                name: "IX_QuantityThresholds_SchemeId_ChemicalType_Level",
                table: "QuantityThresholds",
                columns: new[] { "SchemeId", "ChemicalType", "Level" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HazardTypeLevels_SchemeId_ChemicalType",
                table: "HazardTypeLevels",
                columns: new[] { "SchemeId", "ChemicalType" },
                unique: true);
        }
    }
}
