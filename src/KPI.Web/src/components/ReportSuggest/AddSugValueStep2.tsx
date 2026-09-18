import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { defaultColDef, AG_GRID_LOCALE_TW } from "@/utils/gridConfig";
import { useStepContext } from "../StepComponse";

export default function AddSugValueStep2() {
    const { stepData, updateStepData } = useStepContext();
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState<any[]>([]);

    // 初始抓取資料
    useEffect(() => {
        const rawList = (stepData.suggestReportData as { reportList?: any[] })?.reportList || [];
        setRowData(rawList);
    }, [stepData]);

    // 編輯後更新 stepData
    const onCellValueChanged = useCallback((params: any) => {
        const updatedRows = [...rowData];
        updatedRows[params.node.rowIndex] = params.data;
        console.log("🔧 更新後資料：", updatedRows);

        setRowData(updatedRows);
        updateStepData({
            suggestReportData: { reportList: updatedRows },
        });
    }, [rowData, updateStepData]);

    const columnDefs = useMemo(() => [
        { headerName: "ID", field: "id", hide: true },
        { headerName: "廠商", field: "orgName", editable: false },
        { headerName: "日期", field: "date", editable: false },
        { headerName: "會議/活動", field: "eventType", editable: false },
        { headerName: "類別", field: "suggestType", editable: false },
        { headerName: "委員", field: "userName", editable: false },
        {
            headerName: "建議內容",
            field: "content",
            editable: false,
            cellEditorPopup: true,
            cellEditor: 'agLargeTextCellEditor',
            cellEditorParams: {
                maxLength: 100
            }
        },
        { headerName: "負責單位", field: "respDept", editable: true },
        {
            headerName: "是否參採",
            field: "isAdopted",
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['是', '否', '不參採', '詳備註']
            }
        },
        {
            headerName: "改善對策/辦理情形",
            field: "improveDetails",
            editable: true,
            cellEditorPopup: true,
            cellEditor: 'agLargeTextCellEditor',
            cellEditorParams: {
                maxLength: 100
            }
        },
        {
            headerName: "預估人力投入",
            field: "manpower",
            editable: true,
            cellEditor: 'agNumberCellEditor'
        },
        {
            headerName: "預估經費投入",
            field: "budget",
            editable: true,
            cellEditor: 'agNumberCellEditor'
        },
        {
            headerName: "是否完成改善/辦理",
            field: "completed",
            editable: true,
            sort: 'asc' as const,
            comparator: (a: string | null, b: string | null) => {
                const rank = (v: string | null | undefined) => v === '否' ? 0 : (!v || v === '') ? 1 : 2;
                return rank(a) - rank(b);
            },
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['是', '否']
            }
        },
        {
            headerName: "預估完成年份",
            field: "doneYear",
            editable: true,
            cellEditor: 'agNumberCellEditor'
        },
        {
            headerName: "預估完成月份",
            field: "doneMonth",
            editable: true,
            cellEditor: 'agNumberCellEditor'
        },
        {
            headerName: "平行展開",
            field: "parallelExec",
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['是', '否']
            }
        },
        {
            headerName: "展開計畫",
            field: "execPlan",
            editable: true,
            cellEditorPopup: true,
            cellEditor: 'agLargeTextCellEditor',
            cellEditorParams: {
                maxLength: 100
            }
        },
        { headerName: "備註", field: "remark", editable: true },
    ], []);

    return (
        <div className="ag-theme-alpine w-full" style={{ height: "600px", fontSize: "12px" }}>
            <AgGridReact
                localeText={AG_GRID_LOCALE_TW}
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{ resizable: true, sortable: true }}
                onCellValueChanged={onCellValueChanged}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                suppressAggFuncInHeader={true}         // ❌ 不顯示彙總函式
                suppressFieldDotNotation={true}        // ✅ 若你的欄位名稱有 "."，不自動解析成巢狀物件
            />
        </div>
    );
}