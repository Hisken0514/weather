import React, {forwardRef, useRef} from "react";
import { AgGridReact } from 'ag-grid-react';
import {ColDef, ModuleRegistry} from 'ag-grid-community';
import { AG_GRID_LOCALE_TW } from "@ag-grid-community/locale";
import {AllEnterpriseModule} from "ag-grid-enterprise";
ModuleRegistry.registerModules([AllEnterpriseModule]);


interface AggridProps {
    columnDefs: ColDef[];
    rowData: any[];
}

const SuggestAggrid = forwardRef<AgGridReact, AggridProps>(({ columnDefs, rowData }, ref) => {
    const gridRef = useRef<AgGridReact>(null);

    return (
        <div className="ag-theme-quartz" style={{height: '600px', width: '100%'}}>
            <AgGridReact
                localeText={AG_GRID_LOCALE_TW}
                ref={gridRef}
                columnDefs={columnDefs}
                rowData={rowData}
                sideBar={{
                    toolPanels: [
                        {
                            id: 'columns',
                            labelDefault: '欄位',
                            labelKey: 'columns',
                            iconKey: 'columns',
                            toolPanel: 'agColumnsToolPanel',
                        }
                    ],
                }}
                pagination={true}
                paginationPageSize={20}
                defaultColDef={{
                    flex: 1,
                    sortable: true,
                    resizable: true,
                    filter: true,
                }}
            />
        </div>
    );
});
SuggestAggrid.displayName = "SuggestAggrid";
export default SuggestAggrid;