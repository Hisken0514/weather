using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Forma.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class backfill_audit_result_band_labels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 讓「前次督導結果」指標的離散級距（MinValue == MaxValue）帶有友善標籤，
            // 這樣試算表單才能維持原本的 3 選項下拉選單，而不是退化成裸數字輸入框。
            migrationBuilder.Sql(@"
                UPDATE ""RiskScoringBands"" b
                SET ""Label"" = CASE b.""MinValue""
                        WHEN 0 THEN '均已改善'
                        WHEN 1 THEN '未全部改善'
                        WHEN 2 THEN '未曾納入督導'
                    END
                FROM ""RiskIndicatorDefinitions"" d
                WHERE d.""Id"" = b.""IndicatorId""
                  AND d.""Name"" = '前次督導結果'
                  AND b.""MinValue"" = b.""MaxValue""
                  AND b.""MinValue"" IN (0, 1, 2);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""RiskScoringBands"" b
                SET ""Label"" = NULL
                FROM ""RiskIndicatorDefinitions"" d
                WHERE d.""Id"" = b.""IndicatorId""
                  AND d.""Name"" = '前次督導結果';
            ");
        }
    }
}
