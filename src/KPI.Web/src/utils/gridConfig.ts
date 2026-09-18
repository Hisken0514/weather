// utils/gridConfig.ts
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { AG_GRID_LOCALE_TW } from '@ag-grid-community/locale';

// 註冊所有 Enterprise 模組（只需一次）
ModuleRegistry.registerModules([AllEnterpriseModule]);

// 共用欄位設定
export const defaultColDef = {
    flex: 1,
    resizable: true,
    sortable: true,
    filter: true,
};

// 匯出中文語系
export { AG_GRID_LOCALE_TW };