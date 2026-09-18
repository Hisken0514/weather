'use client'
import React, { useEffect, useMemo, useState } from "react";
import { AgCharts } from "ag-charts-react";
import { AgChartOptions } from "ag-charts-community";
import api from "@/services/apiService"

interface SuggestionData {
    category: string;
    count: number;
}

interface AggridchartProps {
    organizationId?: string;
    organizationName?: string;
}

export default function SuggestionPieChart({ organizationId, organizationName }: AggridchartProps) {
    const [data, setData] = useState<SuggestionData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get("/Report/GetKpiFieldSuggestionCount", {
                    params: organizationId ? { organizationId } : {}
                });
                if (response.data?.success) {
                    setData(response.data.data);
                }
            } catch (error) {
                console.error("取得建議類別資料失敗:", error);
            }
        };

        fetchData();
    }, [organizationId]);

    const options: AgChartOptions = useMemo(() => {
        const total = data.reduce((sum, item) => sum + item.count, 0);
        return {
            data,
            // title: { text: `各建議佔比（${organizationName || '所有公司'}）`, },
            title: { text: `各建議佔比`, },
            series: [
                {
                    type: "pie",
                    angleKey: "count",
                    legendItemKey: "category",
                    innerRadiusRatio: 0.6,
                    calloutLabel: {
                        enabled: true,
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "black"
                    },
                    strokeWidth: 2,
                    tooltip: {
                        renderer: ({ datum, angleKey }) => {
                            const value = datum[angleKey];
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${datum.category}: ${percentage}%`;
                        }
                    }
                }
            ],
            legend: {
                enabled: true,
                item: {
                    label: {
                        fontSize: 13,
                        fontWeight: "bold"
                    }
                }
            }
        };
    }, [data]);

    return (
        <>
            <h2 id="trend-chart-label" className="sr-only">各建議類別佔比圖表</h2>
            <div
                style={{width: "100%", height: "500px"}}
                role="img"
                aria-label={`各建議類別佔比圖表，顯示 ${organizationName || '所有公司'} 的建議分布`}
            >
                <AgCharts options={options}/>
            </div>
        </>
    );
}