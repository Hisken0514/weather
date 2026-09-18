'use client'
import React, { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import { AgChartOptions } from "ag-charts-community";

// 取得委員建議類別的數據
function getSuggestionData() {
    return [
        { category: "製成安全管理(PSM)", count: 50 },
        { category: "環保管理(EP)", count: 30 },
        { category: "消防管理(FR)", count: 15 },
        { category: "能源管理(ECO)", count: 5 },
    ];
}

export default function SuggestionPieChart() {
    const data = getSuggestionData(); // 取得數據

    const options: AgChartOptions = useMemo(() => {
        const total = data.reduce((sum, item) => sum + item.count, 0); // 計算總數
        return {
            data,
            title: { text: "委員建議類別占比" },
            series: [
                {
                    type: "pie",
                    angleKey: "count", // 數值鍵 (建議數量)
                    legendItemKey: "category",
                    innerRadiusRatio: 0.6, // 環形圖
                    calloutLabel: {
                        enabled: true,
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "black", // 設定標籤顏色，確保可見

                    },
                    strokeWidth: 2, // 增加邊界線，提高對比度
                    tooltip: {
                        renderer: ({ datum, angleKey }) => {
                            const value = datum[angleKey];
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${datum.category}: ${percentage}%`;
                        },
                    },
                },
            ],
            legend: {
                enabled: true,
                item: {
                    label: {
                        fontSize: 13,
                        fontWeight: "bold",
                    },
                },
            },
        };
    }, [data]);

    return (
        <>
            <h2 id="trend-chart-label" className="sr-only">建議趨勢圖表</h2>
            <div
                role="img"
                aria-label="建議趨勢圖表，顯示各期數建議數變化情形"
                style={{width: "100%", height: "500px"}}>
                <AgCharts options={options}/>
            </div>
        </>
    );
}