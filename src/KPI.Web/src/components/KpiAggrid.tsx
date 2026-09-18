import React, {
    useMemo,
    useState,
    useRef,
    useEffect,
    forwardRef,
    useImperativeHandle
} from "react";
import {ColDef, ModuleRegistry} from "ag-grid-community";
import type { CellClassParams, CellStyle } from "ag-grid-community"; // ⚠️ 確保你已經有 import
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { AgGridReact, AgGridReact as AgGridReactType } from "ag-grid-react";
import { AG_GRID_LOCALE_TW } from "@ag-grid-community/locale";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    CartesianGrid,
} from "recharts";
import {Toaster,toast} from "react-hot-toast";
ModuleRegistry. registerModules([ AllEnterpriseModule ]);

interface KpiReport {
    year: number;
    period: string;
    kpiReportValue: number;
}

interface KpiDataCycle {
    reports?: KpiReport[];
}

export interface IRow {
    id: number;
    category: string; // e.g. "基礎型", "客製型"
    type: string;     // e.g. "basic", "custom"
    [key: string]: any;
}

interface GridComponentProps {
    columnDefs: ColDef<IRow>[];
    rowData: IRow[];
    defaultColDef?: ColDef;
    activeCategory: string;
    activeType: string;
    columnTitleMap: Record<string, string>;
    isLoading?: boolean;
    onExportData?: (type: 'excel' | 'csv') => void;
    quickFilterText?: string;
}

const GridComponent = forwardRef<AgGridReactType<IRow> | null, GridComponentProps>(
    (
        {
            columnDefs,
            rowData,
            defaultColDef,
            activeCategory,
            activeType,
            columnTitleMap,
            isLoading,
            quickFilterText,
        },
        ref
    ) => {
    const [isEditable, setIsEditable] = useState(false);
    const [selectedRows, setSelectedRows] = useState<IRow[]>([]);
    const [selectedDetail, setSelectedDetail] = useState<IRow | null>(null);
    const gridRef = useRef<AgGridReactType<IRow>>(null);

    // ✅ 把 gridRef 暴露給父層
    useImperativeHandle(ref, () => gridRef.current!);

    //載入詳細資料圖片
    const [filterRange, setFilterRange] = useState("all");
    const [chartData, setChartData] = useState<any[]>([]);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [switchToQuarterlyAt, setSwitchToQuarterlyAt] = useState<string | null>(null);



    useEffect(() => {
        const allReports = selectedDetail?.kpiDatas?.flatMap((kpiData: KpiDataCycle) =>
            (kpiData.reports || []).map((report) => ({
                year: report.year,
                period: report.period,
                kpiReportValue: report.kpiReportValue,
            }))
        );

        if (!allReports || allReports.length === 0) {
            setChartData([]); // ✅ 清空圖表
            return;
        }

        setIsChartLoading(true);
        const timer = setTimeout(() => {
            const sorted = [...allReports].sort((a, b) =>
                `${a.year}_${a.period}`.localeCompare(`${b.year}_${b.period}`)
            );

            const periodOrder = (p: string) =>
                ({ Q1: 1, Q2: 2, Q3: 3, Q4: 4, Y: 5 } as Record<string, number>)[p] ?? 0;

            type ChartPoint = { name: string; value: number | null; sortYear: number; sortPeriod: number; missing: boolean };

            const mapped: ChartPoint[] = sorted.map((r) => ({
                name: `${r.year}_${r.period}`,
                value: parseFloat(String(r.kpiReportValue)),
                sortYear: r.year,
                sortPeriod: periodOrder(r.period),
                missing: false,
            }));

            // 有些指標中途從「年度填報(Y)」改成「季度填報(Q1~Q4)」——判斷從哪一年開始改成季度，
            // 之後每年的缺失判斷要用季度單位（缺 Q1/Q3/Q4 也要標出來），不能只看「這年有沒有任何一筆」。
            const quarterlyYears = sorted.filter((r) => r.period !== "Y").map((r) => r.year);
            const switchYear = quarterlyYears.length ? Math.min(...quarterlyYears) : null;

            const years = sorted.map((r) => r.year);
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            const periodsByYear = new Map<number, Set<string>>();
            sorted.forEach((r) => {
                if (!periodsByYear.has(r.year)) periodsByYear.set(r.year, new Set());
                periodsByYear.get(r.year)!.add(r.period);
            });

            // ✅ 把資料缺失的年份/季度也補進時間軸——用 value:null 讓折線在那個點斷開，
            // 而不是直接跳過，導致前後兩個點被誤接成一直線，看不出中間缺了資料。
            for (let y = minYear; y <= maxYear; y++) {
                const existing = periodsByYear.get(y) ?? new Set<string>();
                const isQuarterly = switchYear !== null && y >= switchYear;
                if (isQuarterly) {
                    (["Q1", "Q2", "Q3", "Q4"] as const).forEach((q) => {
                        if (!existing.has(q)) {
                            mapped.push({ name: `${y}_${q}`, value: null, sortYear: y, sortPeriod: periodOrder(q), missing: true });
                        }
                    });
                } else if (!existing.has("Y")) {
                    mapped.push({ name: `${y}_Y`, value: null, sortYear: y, sortPeriod: periodOrder("Y"), missing: true });
                }
            }
            mapped.sort((a, b) => a.sortYear - b.sortYear || a.sortPeriod - b.sortPeriod);

            setSwitchToQuarterlyAt(switchYear !== null ? `${switchYear}_Q1` : null);
            setChartData(filterRange === "last4" ? mapped.slice(-4) : mapped);
            setIsChartLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedDetail, filterRange]);

    // useEffect(() => {
    //     if (quickFilterText && gridRef.current?.api) {
    //         gridRef.current.api.setQuickFilter(quickFilterText);
    //     }
    // }, [quickFilterText]);



    const filteredRowData = useMemo(() => {
        const result = rowData.filter((row) => {
            const matchCategory =
                activeCategory === "tab_all" || row.field === activeCategory;
            const matchType =
                activeType === "type_all" ||
                (activeType === "basic" && row.category === "基礎型") ||
                (activeType === "custom" && row.category === "客製型");
            return matchCategory && matchType;
        });

        // 🔸 依是否符合目標值排序，未達標放前面
        return result.sort((a, b) => {
            const compare = (item: IRow): boolean => {
                if (!item.isIndicator) return true;  // 如果不是指標，視為合格，排後面

                const actual = item.lastReportValue;
                const target = item.lastTargetValue;
                const operator = item.lastComparisonOperator;

                if (typeof actual !== "number" || typeof target !== "number") return true; // 排後面

                switch (operator) {
                    case ">=": return actual >= target;
                    case "<=": return actual <= target;
                    case ">":  return actual > target;
                    case "<":  return actual < target;
                    case "=":
                    case "==": return actual === target;
                    default:   return true; // 未知邏輯視為合格
                }
            };

            return Number(compare(a)) - Number(compare(b)); // false (不合格=0) 排在前
        });
    }, [rowData, activeCategory, activeType]);

    const toggleEditMode = () => {
        setIsEditable((prev) => !prev);
        setSelectedRows([]);
    };

    const onSelectionChanged = (event: any) => {
        setSelectedRows(event.api.getSelectedRows());
    };

    const deleteSelectedRows = () => {
        if (selectedRows.length === 0) return toast.error("請先選擇要刪除的資料！");
        toast.error("⚠️ 僅從畫面中刪除，未同步後端");
        setSelectedRows([]);
    };

    // ✅ 建議寫法：使用 AG Grid 內建的選擇欄位類型
    // 用 useMemo 固定住這幾個欄位定義的參考——不然每次 render（例如點開側邊篩選欄）
    // 都會產生新的物件，AG Grid 收到「新的 columnDefs」就會把使用者剛設定的篩選條件重設回預設值
    const checkboxSelectionCol = React.useMemo<ColDef>(() => ({
        type: "agCheckboxSelectionColumn",
        width: 50,
        pinned: "left",
        suppressSizeToFit: true,
    }), []);

    const actionColumn = React.useMemo<ColDef>(() => ({
        headerName: "操作",
        field: "actions",
        pinned: "right",
        width: 120,
        cellRenderer: (params: any) => (
            <span
                className="text-blue-600 text-sm hover:underline cursor-pointer"
                onClick={() => setSelectedDetail(params.data)}
            >
                查看詳情
            </span>
        )
    }), []);

    const onGridReady = (params: any) => {
        try {
            const allColumnIds: string[] = [];
            const columns = params?.columnApi?.getAllColumns?.();
            if (columns && Array.isArray(columns)) {
                columns.forEach((col: any) => {
                    allColumnIds.push(col.getId());
                });
                params.columnApi.autoSizeColumns(allColumnIds, false);
            }
        } catch (err) {
            console.error("AutoSize column failed:", err);
        }
    };

    // 同樣用 useMemo 固定住最終傳給 AG Grid 的 columnDefs/defaultColDef 參考，
    // 只在真的相關的東西變了（columnDefs prop、isEditable）才重新組出新陣列。
    const mergedColumnDefs = React.useMemo<ColDef[]>(() => [
        ...(isEditable ? [checkboxSelectionCol] : []),
        ...columnDefs.map((col) => {
            if (col.field === "lastReportValue") {
                return {
                    ...col,
                    editable: isEditable,
                    cellStyle: (params: CellClassParams<IRow>): CellStyle => {
                        const actual = params.value;
                        const data = params.data;

                        if (!data || actual === null || actual === undefined) {
                            return {textAlign: "left"};
                        }

                        if (!data.isIndicator) {
                            return {textAlign: "left"};
                        }

                        const target = data.lastTargetValue;
                        const operator = data.lastComparisonOperator;

                        let meets = true;
                        if (typeof actual === "number" && typeof target === "number") {
                            switch (operator) {
                                case ">=": meets = actual >= target; break;
                                case "<=": meets = actual <= target; break;
                                case ">": meets = actual > target; break;
                                case "<": meets = actual < target; break;
                                case "=":
                                case "==": meets = actual === target; break;
                                default: meets = true;
                            }
                        }

                        return meets
                            ? {textAlign: "left"}
                            : {textAlign: "left", color: "#d32f2f", fontWeight: "bold"};
                    },
                    cellRenderer: (params: CellClassParams<IRow>) => {
                        const actual = params.value;
                        const data = params.data;

                        if (!data || actual === null || actual === undefined) return actual;

                        const target = data.lastTargetValue;
                        const operator = data.lastComparisonOperator;

                        let meets = true;
                        if (typeof actual === "number" && typeof target === "number") {
                            switch (operator) {
                                case ">=": meets = actual >= target; break;
                                case "<=": meets = actual <= target; break;
                                case ">": meets = actual > target; break;
                                case "<": meets = actual < target; break;
                                case "=":
                                case "==": meets = actual === target; break;
                                default: meets = true;
                            }
                        }

                        return meets ? actual : `⚠️ ${actual}`;
                    }
                };
            }

            return {
                ...col,
                editable: isEditable,
            };
        }),
        actionColumn,
    ], [columnDefs, isEditable, checkboxSelectionCol, actionColumn]);

    const mergedDefaultColDef = React.useMemo<ColDef>(() => ({
        sortable: true,
        filter: true,
        resizable: true,
        editable: isEditable,
        ...defaultColDef,
    }), [isEditable, defaultColDef]);

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

                <p className="text-sm text-gray-500 px-1">
                    類別：{activeCategory === "tab_all" ? "全部類別" : activeCategory}，
                    指標類型：
                    {activeType === "type_all"
                        ? "全部"
                        : activeType === "basic"
                            ? "基礎型"
                            : "客製型"}
                </p>

                {isLoading ? (
                    <div className="w-full h-[700px] flex items-center justify-center">
                        <span className="loading loading-spinner loading-lg text-primary">資料載入中…</span>
                    </div>
                ) : filteredRowData.length === 0 ? (
                    <div className="text-center text-gray-500 mt-6">
                        查無符合條件的資料
                    </div>
                ) : (
                    <div
                        className="ag-theme-quartz"
                        style={{width: "100%", height: "700px", marginTop: "20px"}}
                    >
                        <AgGridReact
                            key={`${activeCategory}-${activeType}`}
                            ref={gridRef}
                            quickFilterText={quickFilterText}
                            localeText={AG_GRID_LOCALE_TW}
                            onGridReady={onGridReady}
                            rowData={filteredRowData}
                            sideBar={true}
                            columnDefs={mergedColumnDefs}
                            defaultColDef={mergedDefaultColDef}
                            rowSelection="multiple"
                            onSelectionChanged={onSelectionChanged}
                            animateRows={true}
                            pagination={true}
                            paginationPageSize={20}
                            singleClickEdit={true}
                            stopEditingWhenCellsLoseFocus={true}
                            getRowStyle={(params) => {
                                const row = params.data;
                                const actual = row.lastReportValue;
                                const target = row.lastTargetValue;
                                const operator = row.lastComparisonOperator;

                                if (typeof actual === "number" && typeof target === "number") {
                                    let meets ;
                                    switch (operator) {
                                        case ">=":
                                            meets = actual >= target;
                                            break;
                                        case "<=":
                                            meets = actual <= target;
                                            break;
                                        case ">":
                                            meets = actual > target;
                                            break;
                                        case "<":
                                            meets = actual < target;
                                            break;
                                        case "=":
                                        case "==":
                                            meets = actual === target;
                                            break;
                                        default:
                                            meets = true;
                                    }

                                    if (!meets) {
                                        return {
                                            // backgroundColor: "#fdecea", // 淺紅色
                                            color: "#d32f2f",
                                            fontWeight: "bold"
                                        };
                                    }
                                }

                                return undefined; // 默認樣式
                            }}
                        />
                    </div>
                )}
                {selectedDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl relative">
                            <h2 className="text-xl font-semibold mb-4 text-primary">指標詳情</h2>
                            <p className="text-sm font-semibold mb-2 text-base-content">歷史執行情況：</p>

                            <div className="mb-2 flex justify-between items-center">
                                <span className="text-sm text-gray-500">KPI 趨勢圖</span>
                                <select
                                    aria-label="篩選條件"
                                    className="select select-sm select-bordered text-base-content"
                                    value={filterRange}
                                    onChange={(e) => setFilterRange(e.target.value)}
                                >
                                    <option value="all">全部</option>
                                    <option value="last4">最近四期</option>
                                </select>
                            </div>

                            <div className="h-80 mb-4 border rounded flex items-center justify-center bg-gray-50 pt-2 pr-4">
                                {isChartLoading ? (
                                    <span
                                        className="loading loading-spinner loading-md mb-2 text-base-content">指標趨勢圖載入中，請稍候…</span>
                                ) : chartData.length === 0 ? (
                                    <div className="text-gray-400 text-sm">尚無執行資料</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{top: 24, right: 16, left: 8, bottom: 24}}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                            <XAxis
                                                dataKey="name"
                                                tick={{fontSize: 11}}
                                                angle={-35}
                                                textAnchor="end"
                                                height={50}
                                                interval="preserveStartEnd"
                                                tickMargin={8}
                                            />
                                            <YAxis
                                                tick={{fontSize: 11}}
                                                width={44}
                                                label={{
                                                    value: selectedDetail.unit || "單位",
                                                    position: "top",
                                                    offset: 12,
                                                    fontSize: 11,
                                                    fill: "#6b7280",
                                                }}
                                            />
                                            <Tooltip
                                                content={({active, payload, label}) => {
                                                    if (active && payload && payload.length) {
                                                        const point = payload[0].payload as { value: number | null; missing?: boolean };
                                                        return (
                                                            <div
                                                                className="bg-white border p-2 rounded shadow text-xs">
                                                                <p>{label}</p>
                                                                {point.missing || point.value === null ? (
                                                                    <p className="text-gray-400">無資料</p>
                                                                ) : (
                                                                    <p>
                                                                        執行值：{point.value} {selectedDetail.unit || ""}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                dot={{r: 3.5, stroke: "#6366f1", strokeWidth: 1, fill: "#fff"}}
                                                activeDot={{r: 6}}
                                                connectNulls={false}
                                            />
                                            {selectedDetail.targetValue && (
                                                <ReferenceLine
                                                    y={selectedDetail.targetValue}
                                                    stroke="#9ca3af"
                                                    strokeDasharray="4 2"
                                                    label={{
                                                        value: `目標值 ${selectedDetail.targetValue}`,
                                                        position: "insideTopRight",
                                                        fontSize: 10,
                                                        fill: "#6b7280",
                                                    }}
                                                />
                                            )}
                                            {switchToQuarterlyAt && chartData.some((p) => p.name === switchToQuarterlyAt) && (
                                                <ReferenceLine
                                                    x={switchToQuarterlyAt}
                                                    stroke="#f59e0b"
                                                    strokeDasharray="3 3"
                                                    label={{
                                                        value: "改為季度填報",
                                                        position: "insideTopLeft",
                                                        fontSize: 10,
                                                        fill: "#f59e0b",
                                                    }}
                                                />
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <ul className="space-y-2 text-sm max-h-[300px] overflow-y-auto">
                                {Object.entries(selectedDetail).map(([key, value]) => {
                                    if (key === "kpiDatas" && Array.isArray(value)) {
                                        return (
                                            <li  className=" text-base-content" key={key}>
                                                <strong>KPI 循環資料：</strong>
                                                <ul className="list-disc list-inside ml-4 space-y-2">
                                                    {value.map((kpiData: any, idx: number) => (
                                                        <li key={idx}>
                                                            <div className="mb-1 font-semibold">
                                                                循環名稱：{kpiData.kpiCycleName || "-"}
                                                            </div>
                                                            <div className="ml-2">
                                                                <p>基線年：{kpiData.baselineYear}</p>
                                                                <p>基線值：{kpiData.baselineValue}</p>
                                                                <p>目標值：{kpiData.targetValue}</p>
                                                                <p>備註：{kpiData.remarks || "-"}</p>
                                                                {Array.isArray(kpiData.reports) && (
                                                                    <ul className="list-disc list-inside ml-4 mt-1">
                                                                        {kpiData.reports.map((report: any, rIdx: number) => (
                                                                            <li key={rIdx}>
                                                                                {report.year}_{report.period}：{report.kpiReportValue}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        );
                                    }

                                    // 其他欄位照原本方式顯示
                                    return (
                                        <li  className=" text-base-content" key={key}>
                                            <strong>{columnTitleMap[key] || key}：</strong>
                                            <span> {String(value ?? "-")}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <button
                                onClick={() => setSelectedDetail(null)}
                                className="absolute top-2 right-2 btn btn-sm btn-circle btn-outline"
                                title="關閉"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
});
GridComponent.displayName = "GridComponent";
export default GridComponent;