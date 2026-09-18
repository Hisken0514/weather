"use client";
import React from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { toast } from "react-hot-toast";
import { quarterHelper } from "@/helpers/quarter";

/** ===== 共用：帶入 Authorization ===== */
async function auth() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

/** ====== 後端 DTO 型別（最小可用，對齊你現有後端） ====== */
type KpiItemUpsertDto = {
    indicatorNumber: number;
    kpiCategoryId: number;
    kpiFieldId: number;
    organizationId: number | null;
};

type KpiItemNameUpsertDto = {
    name: string;
    startYear: number;
    endYear?: number | null;
};

type KpiDetailItemNameUpsertDto = {
    name: string;
    startYear: number;
    endYear?: number | null;
};

type KpiDetailItemDto = {
    id: number;
    kpiItemId: number;
    unit: string;
    comparisonOperator?: string | null;
    isIndicator: boolean;
    names: {
        id: number;
        name: string;
        startYear: number;
        endYear?: number | null;
        userEmail: string;
    }[];
};

type KpiDetailItemUpsertDto = {
    unit: string;
    comparisonOperator?: string | null;
    isIndicator: boolean;
};

type KpiDataDto = {
    id: number;
    isApplied: boolean;
    baselineYear: string;
    baselineValue?: number | null;
    targetValue?: number | null;
    remarks?: string | null;
    detailItemId: number;
    kpiCycleId?: number | null;
    organizationId?: number | null;
    productionSite?: string | null;
};

type KpiDataUpsertDto = {
    isApplied: boolean;
    baselineYear: string;
    baselineValue: number | null;
    targetValue: number | null;
    remarks?: string | null;
    detailItemId: number;
    kpiCycleId?: number | null;
    organizationId?: number | null;
    productionSite?: string | null;
};

type KpiReportDto = {
    id: number;
    year: number;
    period: string; // Q1/Q2/Q3/Q4/H1/Y
    kpiReportValue?: number | null;
    isSkipped: boolean;
    remarks?: string | null;
    status: number; // byte
    kpiDataId: number;
};

type KpiReportUpsertDto = {
    year: number;
    period: string; // Q1/Q2/Q3/Q4/H1/Y
    kpiReportValue?: number | null;
    isSkipped: boolean;
    remarks?: string | null;
};

/** ===== 後端 GetItem 回傳（簡化） ===== */
type ItemDetail = {
    id: number;
    indicatorNumber: number;
    kpiCategoryId: number;
    kpiFieldId: number;
    organizationId?: number | null;
    organizationName?: string | null;
    names: { id: number; name: string; startYear: number; endYear?: number | null; userEmail: string }[];
    detailItems: KpiDetailItemDto[];
    createTime: string;
    uploadTime: string;
};

export default function ItemEditor({
                                       itemId,
                                       onClose,
                                   }: {
    itemId: number;
    onClose: () => void;
}) {
    const isNew = itemId === 0;

    const [detail, setDetail] = React.useState<ItemDetail | null>(null);
    const [tab, setTab] = React.useState<"base" | "names" | "details" | "data" | "reports">("base");

    const [selectedDetail, setSelectedDetail] = React.useState<KpiDetailItemDto | null>(null);
    const [selectedDataId, setSelectedDataId] = React.useState<number | null>(null);

    /** 載入單筆 Item 詳情 */
    const load = React.useCallback(async () => {
        if (isNew) {
            setDetail(null);
            return;
        }
        const { data } = await api.get<ItemDetail>(`/Admin/kpi/items/${itemId}`, await auth());
        setDetail(data);
    }, [itemId, isNew]);

    React.useEffect(() => {
        load();
    }, [load]);

    /** ===== 基本欄位 ===== */
    const [base, setBase] = React.useState<KpiItemUpsertDto>({
        indicatorNumber: 1,
        kpiCategoryId: 0,
        kpiFieldId: 1,
        organizationId: null,
    });

    React.useEffect(() => {
        if (detail) {
            setBase({
                indicatorNumber: detail.indicatorNumber,
                kpiCategoryId: detail.kpiCategoryId,
                kpiFieldId: detail.kpiFieldId,
                organizationId: detail.organizationId ?? null,
            });
        }
    }, [detail]);

    const saveBase = async () => {
        try {
            if (isNew) {
                await api.post("/Admin/kpi/items", base, await auth());
                toast.success("已建立項目");
                onClose();
            } else {
                await api.put(`/Admin/kpi/items/${itemId}`, base, await auth());
                toast.success("已更新基本資料");
                await load();
            }
        } catch (e: any) {
            toast.error(e?.message || "儲存失敗");
        }
    };

    /** ===== 名稱版本（ItemName）===== */
    const addName = async (dto: KpiItemNameUpsertDto) => {
        if (isNew || !itemId) return toast.error("請先儲存基本資料");
        await api.post(`/Admin/kpi/items/${itemId}/names`, dto, await auth());
        toast.success("已新增");
        await load();
    };

    const updateName = async (nameId: number, dto: KpiItemNameUpsertDto) => {
        await api.put(`/Admin/kpi/items/${itemId}/names/${nameId}`, dto, await auth());
        toast.success("已更新");
        await load();
    };

    const removeName = async (nameId: number) => {
        if (!confirm("確定刪除名稱版本？")) return;
        await api.delete(`/Admin/kpi/items/${itemId}/names/${nameId}`, await auth());
        toast.success("已刪除");
        await load();
    };

    /** ===== 細項（DetailItem）===== */
    const addDetail = async (dto: KpiDetailItemUpsertDto) => {
        if (isNew) return toast.error("請先儲存基本資料");
        await api.post(`/Admin/kpi/items/${itemId}/details`, dto, await auth());
        toast.success("已新增細項");
        await load();
    };

    const updateDetail = async (detailId: number, dto: KpiDetailItemUpsertDto) => {
        await api.put(`/Admin/kpi/details/${detailId}`, dto, await auth());
        toast.success("已更新");
        await load();
    };

    const removeDetail = async (detailId: number) => {
        if (!confirm("確定刪除細項及其下資料？")) return;
        await api.delete(`/Admin/kpi/details/${detailId}`, await auth());
        toast.success("已刪除");
        await load();
    };

    /** 細項名稱版本（DetailItemName） */
    const addDetailName = async (detailId: number, dto: KpiDetailItemNameUpsertDto) => {
        await api.post(`/Admin/kpi/details/${detailId}/names`, dto, await auth());
        toast.success("已新增");
        await load();
    };

    const updateDetailName = async (detailId: number, nameId: number, dto: KpiDetailItemNameUpsertDto) => {
        await api.put(`/Admin/kpi/details/${detailId}/names/${nameId}`, dto, await auth());
        toast.success("已更新");
        await load();
    };

    const removeDetailName = async (detailId: number, nameId: number) => {
        if (!confirm("確定刪除細項名稱版本？")) return;
        await api.delete(`/Admin/kpi/details/${detailId}/names/${nameId}`, await auth());
        toast.success("已刪除");
        await load();
    };

    /** ===== KpiData（基線/目標）===== */
    const [dataList, setDataList] = React.useState<KpiDataDto[]>([]);

    const loadData = React.useCallback(async (detailId: number) => {
        const { data } = await api.get<KpiDataDto[]>(`/Admin/kpi/details/${detailId}/data`, await auth());
        setDataList(data);
    }, []);

    React.useEffect(() => {
        if (selectedDetail) loadData(selectedDetail.id);
    }, [selectedDetail, loadData]);

    const addData = async (dto: KpiDataUpsertDto) => {
        if (!selectedDetail) return toast.error("請先選擇細項");
        await api.post(`/Admin/kpi/details/${selectedDetail.id}/data`, dto, await auth());
        toast.success("已新增基線/目標");
        await loadData(selectedDetail.id);
    };

    const updateData = async (dataId: number, dto: KpiDataUpsertDto) => {
        await api.put(`/Admin/kpi/data/${dataId}`, dto, await auth());
        toast.success("已更新");
        if (selectedDetail) await loadData(selectedDetail.id);
    };

    const removeData = async (dataId: number) => {
        if (!confirm("確定刪除？")) return;
        await api.delete(`/Admin/kpi/data/${dataId}`, await auth());
        toast.success("已刪除");
        if (selectedDetail) await loadData(selectedDetail.id);
    };

    /** ===== Reports（季度報告）===== */
    const [reports, setReports] = React.useState<KpiReportDto[]>([]);

    const loadReports = React.useCallback(async () => {
        if (!selectedDataId) {
            setReports([]);
            return;
        }
        const { data } = await api.get<KpiReportDto[]>(`/Admin/kpi/data/${selectedDataId}/reports`, await auth());
        setReports(data);
    }, [selectedDataId]);

    React.useEffect(() => {
        loadReports();
    }, [loadReports]);

    const addReport = async (dto: KpiReportUpsertDto) => {
        if (!selectedDataId) return toast.error("請先選擇 KpiData");
        await api.post(`/Admin/kpi/data/${selectedDataId}/reports`, dto, await auth());
        toast.success("已新增報告");
        await loadReports();
    };

    const updateReport = async (reportId: number, dto: KpiReportUpsertDto) => {
        await api.put(`/Admin/kpi/reports/${reportId}`, dto, await auth());
        toast.success("已更新");
        await loadReports();
    };

    const removeReport = async (reportId: number) => {
        if (!confirm("確定刪除報告？")) return;
        await api.delete(`/Admin/kpi/reports/${reportId}`, await auth());
        toast.success("已刪除");
        await loadReports();
    };

    const changeStatus = async (reportId: number, newStatus: number) => {
        // 後端定義：PATCH /Admin/kpi/reports/{reportId}/status，Body = byte newStatus
        await api.patch(`/Admin/kpi/reports/${reportId}/status`, newStatus, await auth());
        toast.success("狀態已更新");
        await loadReports();
    };

    /** ===== UI ===== */
    return (
        <div className="bg-white border rounded-xl p-6 h-full">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                    {isNew ? "新增指標項目" : `編輯指標 #${detail?.indicatorNumber ?? ""}`}
                </h3>
                <div className="flex gap-2">
                    <button className={`px-3 py-1 rounded border ${tab === "base" && "bg-gray-100"}`} onClick={() => setTab("base")}>
                        基本
                    </button>
                    <button className={`px-3 py-1 rounded border ${tab === "names" && "bg-gray-100"}`} onClick={() => setTab("names")}>
                        名稱版本
                    </button>
                    <button className={`px-3 py-1 rounded border ${tab === "details" && "bg-gray-100"}`} onClick={() => setTab("details")}>
                        細項
                    </button>
                    <button className={`px-3 py-1 rounded border ${tab === "data" && "bg-gray-100"}`} onClick={() => setTab("data")}>
                        基線/目標
                    </button>
                    <button className={`px-3 py-1 rounded border ${tab === "reports" && "bg-gray-100"}`} onClick={() => setTab("reports")}>
                        季度報告
                    </button>
                </div>
            </div>

            {/* 基本 */}
            {tab === "base" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <LabeledInput
                            label="指標編號"
                            type="number"
                            value={base.indicatorNumber}
                            onChange={(v) => setBase((b) => ({ ...b, indicatorNumber: Number(v) || 0 }))}
                        />
                        <LabeledInput
                            label="類別 Id"
                            type="number"
                            value={base.kpiCategoryId}
                            onChange={(v) => setBase((b) => ({ ...b, kpiCategoryId: Number(v) || 0 }))}
                        />
                        <LabeledInput
                            label="領域 Id"
                            type="number"
                            value={base.kpiFieldId}
                            onChange={(v) => setBase((b) => ({ ...b, kpiFieldId: Number(v) || 0 }))}
                        />
                        <LabeledInput
                            label="客製組織 Id（可空）"
                            value={base.organizationId ?? ""}
                            onChange={(v) => setBase((b) => ({ ...b, organizationId: v ? Number(v) : null }))}
                        />
                    </div>
                    <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={saveBase}>
                        {isNew ? "建立" : "儲存"}
                    </button>
                </div>
            )}

            {/* 名稱版本 */}
            {tab === "names" && !isNew && detail && (
                <NamesPanel rows={detail.names} onAdd={addName} onUpdate={updateName} onDelete={removeName} />
            )}

            {/* 細項 */}
            {tab === "details" && !isNew && detail && (
                <DetailsPanel
                    rows={detail.detailItems}
                    onAdd={addDetail}
                    onUpdate={updateDetail}
                    onDelete={removeDetail}
                    onAddName={addDetailName}
                    onUpdateName={updateDetailName}
                    onDeleteName={removeDetailName}
                    onPickForData={(d) => {
                        setSelectedDetail(d);
                        setTab("data");
                    }}
                />
            )}

            {/* KpiData */}
            {tab === "data" && selectedDetail && (
                <DataPanel
                    detail={selectedDetail}
                    list={dataList}
                    onAdd={addData}
                    onUpdate={updateData}
                    onDelete={removeData}
                    onPickForReports={(dataId) => {
                        setSelectedDataId(dataId);
                        setTab("reports");
                    }}
                />
            )}

            {/* Reports */}
            {tab === "reports" && selectedDataId && (
                <ReportsPanel
                    list={reports}
                    onAdd={addReport}
                    onUpdate={updateReport}
                    onDelete={removeReport}
                    onChangeStatus={changeStatus}
                />
            )}
        </div>
    );
}

/** ====== 子面板：名稱版本 ====== */
function NamesPanel(props: {
    rows: { id: number; name: string; startYear: number; endYear?: number | null; userEmail: string }[];
    onAdd: (dto: KpiItemNameUpsertDto) => void | Promise<void> | Promise<string | undefined>;
    onUpdate: (id: number, dto: KpiItemNameUpsertDto) => void | Promise<void>;
    onDelete: (id: number) => void | Promise<void>;
}) {
    const [draft, setDraft] = React.useState<KpiItemNameUpsertDto>({
        name: "",
        startYear: new Date().getFullYear(),
        endYear: undefined,
    });
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    className="border rounded px-3 py-2"
                    placeholder="名稱"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
                <input
                    className="border rounded px-3 py-2 w-28"
                    placeholder="開始年"
                    type="number"
                    value={draft.startYear}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, startYear: Number(e.target.value) || new Date().getFullYear() }))
                    }
                />
                <input
                    className="border rounded px-3 py-2 w-28"
                    placeholder="結束年(可空)"
                    value={draft.endYear ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, endYear: e.target.value ? Number(e.target.value) : undefined }))}
                />
                <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={() => props.onAdd(draft)}>
                    新增
                </button>
            </div>
            <table className="w-full text-sm">
                <thead>
                <tr className="bg-gray-50">
                    <th className="p-2 text-left">名稱</th>
                    <th className="p-2">起</th>
                    <th className="p-2">迄</th>
                    <th className="p-2">建立者</th>
                    <th className="p-2 text-right">操作</th>
                </tr>
                </thead>
                <tbody>
                {props.rows.map((r) => (
                    <tr key={r.id} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 text-center">{r.startYear}</td>
                        <td className="p-2 text-center">{r.endYear ?? "-"}</td>
                        <td className="p-2 text-center">{r.userEmail}</td>
                        <td className="p-2 text-right">
                            <button
                                className="text-indigo-600 mr-3"
                                onClick={() => props.onUpdate(r.id, { name: r.name, startYear: r.startYear, endYear: r.endYear ?? undefined })}
                            >
                                編輯
                            </button>
                            <button className="text-red-600" onClick={() => props.onDelete(r.id)}>
                                刪除
                            </button>
                        </td>
                    </tr>
                ))}
                {props.rows.length === 0 && (
                    <tr>
                        <td className="p-4 text-gray-500" colSpan={5}>
                            尚無版本
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

/** ====== 子面板：細項 ====== */
function DetailsPanel(props: {
    rows: KpiDetailItemDto[];
    onAdd: (dto: KpiDetailItemUpsertDto) => void | Promise<void> | Promise<string | undefined>;
    onUpdate: (id: number, dto: KpiDetailItemUpsertDto) => void | Promise<void>;
    onDelete: (id: number) => void | Promise<void>;
    onAddName: (detailId: number, dto: KpiDetailItemNameUpsertDto) => void | Promise<void>;
    onUpdateName: (detailId: number, nameId: number, dto: KpiDetailItemNameUpsertDto) => void | Promise<void>;
    onDeleteName: (detailId: number, nameId: number) => void | Promise<void>;
    onPickForData: (detail: KpiDetailItemDto) => void;
}) {
    const [draft, setDraft] = React.useState<KpiDetailItemUpsertDto>({
        unit: "",
        comparisonOperator: null as any,
        isIndicator: true,
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <input
                    className="border rounded px-3 py-2"
                    placeholder="單位(例：次/年)"
                    value={draft.unit}
                    onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                />
                <input
                    className="border rounded px-3 py-2 w-24"
                    placeholder="公式(> < =)"
                    value={draft.comparisonOperator ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, comparisonOperator: e.target.value || null }))}
                />
                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={draft.isIndicator}
                        onChange={(e) => setDraft((d) => ({ ...d, isIndicator: e.target.checked }))}
                    />
                    指標項目
                </label>
                <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={() => props.onAdd(draft)}>
                    新增細項
                </button>
            </div>

            {props.rows.map((d) => (
                <div key={d.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div className="font-medium">
                            #{d.id} {d.unit} {d.comparisonOperator ? `(${d.comparisonOperator})` : ""} {d.isIndicator ? "・指標" : ""}
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="text-indigo-600"
                                onClick={() =>
                                    props.onUpdate(d.id, {
                                        unit: d.unit,
                                        comparisonOperator: d.comparisonOperator ?? null!,
                                        isIndicator: d.isIndicator,
                                    })
                                }
                            >
                                編輯
                            </button>
                            <button className="text-gray-600" onClick={() => props.onPickForData(d)}>
                                管理基線/目標
                            </button>
                            <button className="text-red-600" onClick={() => props.onDelete(d.id)}>
                                刪除
                            </button>
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="text-sm text-gray-600 mb-1">名稱版本</div>
                        <InlineNames
                            rows={d.names}
                            onAdd={(dto) => props.onAddName(d.id, dto)}
                            onUpdate={(nameId, dto) => props.onUpdateName(d.id, nameId, dto)}
                            onDelete={(nameId) => props.onDeleteName(d.id, nameId)}
                        />
                    </div>
                </div>
            ))}
            {props.rows.length === 0 && <div className="text-gray-500">尚無細項，請新增。</div>}
        </div>
    );
}

function InlineNames(props: {
    rows: { id: number; name: string; startYear: number; endYear?: number | null; userEmail: string }[];
    onAdd: (dto: KpiDetailItemNameUpsertDto) => void | Promise<void>;
    onUpdate: (id: number, dto: KpiDetailItemNameUpsertDto) => void | Promise<void>;
    onDelete: (id: number) => void | Promise<void>;
}) {
    const [draft, setDraft] = React.useState<KpiDetailItemNameUpsertDto>({
        name: "",
        startYear: new Date().getFullYear(),
        endYear: undefined,
    });
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    className="border rounded px-2 py-1"
                    placeholder="名稱"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
                <input
                    className="border rounded px-2 py-1 w-24"
                    type="number"
                    value={draft.startYear}
                    onChange={(e) => setDraft((d) => ({ ...d, startYear: Number(e.target.value) || new Date().getFullYear() }))}
                />
                <input
                    className="border rounded px-2 py-1 w-24"
                    value={draft.endYear ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, endYear: e.target.value ? Number(e.target.value) : undefined }))}
                />
                <button className="px-2 py-1 rounded bg-gray-800 text-white" onClick={() => props.onAdd(draft)}>
                    新增
                </button>
            </div>
            <ul className="text-sm">
                {props.rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between border rounded px-2 py-1">
                        <div>
                            {r.name} ・ {r.startYear} - {r.endYear ?? "-"}
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="text-indigo-600"
                                onClick={() => props.onUpdate(r.id, { name: r.name, startYear: r.startYear, endYear: r.endYear ?? undefined })}
                            >
                                編輯
                            </button>
                            <button className="text-red-600" onClick={() => props.onDelete(r.id)}>
                                刪除
                            </button>
                        </div>
                    </li>
                ))}
                {props.rows.length === 0 && <li className="text-gray-500">尚無版本</li>}
            </ul>
        </div>
    );
}

/** ====== 子面板：KpiData ====== */
function DataPanel(props: {
    detail: KpiDetailItemDto;
    list: KpiDataDto[];
    onAdd: (dto: KpiDataUpsertDto) => void | Promise<void> | Promise<string | undefined>;
    onUpdate: (id: number, dto: KpiDataUpsertDto) => void | Promise<void>;
    onDelete: (id: number) => void | Promise<void>;
    onPickForReports: (dataId: number) => void;
}) {
    const [cycles, setCycles] = React.useState<
        { id: number; name: string; startYear: number; endYear: number; isActive: boolean }[]
    >([]);

    // 載入 KpiCycle 清單
    React.useEffect(() => {
        (async () => {
            try {
                const token = await getAccessToken();
                const { data } = await api.get("/Admin/kpi/cycles", {
                    headers: { Authorization: token ? `Bearer ${token.value}` : "" },
                });
                setCycles(data);
            } catch (e) {
                console.error(e);
                toast.error("載入週期清單失敗");
            }
        })();
    }, []);

    const [draft, setDraft] = React.useState<KpiDataUpsertDto>({
        isApplied: true,
        baselineYear: String(new Date().getFullYear()),
        baselineValue: null,
        targetValue: null,
        remarks: "",
        detailItemId: props.detail.id,
        kpiCycleId: null,        // ✅ 週期預設 null，可不指定
        organizationId: null,
        productionSite: "",
    });

    // 便於顯示資料列的週期名稱
    const cycleText = React.useCallback(
        (id?: number | null) => {
            if (!id) return "-";
            const c = cycles.find((x) => x.id === id);
            if (!c) return `#${id}`;
            return `${c.name} (${c.startYear}-${c.endYear})${c.isActive ? "" : "・停用"}`;
        },
        [cycles]
    );

    return (
        <div className="space-y-4">
            <div className="font-medium">細項 #{props.detail.id} 的基線/目標</div>

            {/* 新增區（含週期下拉） */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* 週期選擇 */}
                <select
                    className="border rounded px-2 py-1"
                    value={draft.kpiCycleId ?? ""}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            kpiCycleId: e.target.value ? Number(e.target.value) : null,
                        }))
                    }
                    title="選擇週期（可不指定）"
                >
                    <option value="">（不指定週期）</option>
                    {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}（{c.startYear}-{c.endYear}）{c.isActive ? "" : "・停用"}
                        </option>
                    ))}
                </select>

                <input
                    className="border rounded px-2 py-1 w-24"
                    placeholder="基線年"
                    value={draft.baselineYear}
                    onChange={(e) => setDraft((d) => ({ ...d, baselineYear: e.target.value }))}
                />
                <input
                    className="border rounded px-2 py-1 w-28"
                    placeholder="基線值"
                    value={draft.baselineValue ?? ""}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            baselineValue: e.target.value ? Number(e.target.value) : null,
                        }))
                    }
                />
                <input
                    className="border rounded px-2 py-1 w-28"
                    placeholder="目標值"
                    value={draft.targetValue ?? ""}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            targetValue: e.target.value ? Number(e.target.value) : null,
                        }))
                    }
                />
                <input
                    className="border rounded px-2 py-1 w-40"
                    placeholder="備註"
                    value={draft.remarks ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                />
                <button
                    className="px-3 py-1 rounded bg-indigo-600 text-white"
                    onClick={() => props.onAdd(draft)}
                >
                    新增
                </button>
            </div>

            {/* 清單（加一欄顯示週期） */}
            <table className="w-full text-sm">
                <thead>
                <tr className="bg-gray-50">
                    <th className="p-2">週期</th>
                    <th className="p-2">年</th>
                    <th className="p-2">基線</th>
                    <th className="p-2">目標</th>
                    <th className="p-2">備註</th>
                    <th className="p-2 text-right">操作</th>
                </tr>
                </thead>
                <tbody>
                {props.list.map((d) => (
                    <tr key={d.id} className="border-t">
                        <td className="p-2">{cycleText(d.kpiCycleId)}</td>
                        <td className="p-2 text-center">{d.baselineYear}</td>
                        <td className="p-2 text-right">{d.baselineValue ?? "-"}</td>
                        <td className="p-2 text-right">{d.targetValue ?? "-"}</td>
                        <td className="p-2">{d.remarks ?? "-"}</td>
                        <td className="p-2 text-right">
                            <button
                                className="text-gray-700 mr-3"
                                onClick={() => props.onPickForReports(d.id)}
                            >
                                季度報告
                            </button>
                            <button
                                className="text-indigo-600 mr-3"
                                onClick={() =>
                                    props.onUpdate(d.id, {
                                        // 用資料列的原值為主，避免被目前草稿蓋掉
                                        isApplied: d.isApplied,
                                        baselineYear: d.baselineYear,
                                        baselineValue: d.baselineValue ?? null,
                                        targetValue: d.targetValue ?? null,
                                        remarks: d.remarks ?? "",
                                        detailItemId: props.detail.id,
                                        kpiCycleId: d.kpiCycleId ?? null, // ✅ 一併帶回
                                        organizationId: d.organizationId ?? null,
                                        productionSite: d.productionSite ?? "",
                                    })
                                }
                            >
                                編輯
                            </button>
                            <button className="text-red-600" onClick={() => props.onDelete(d.id)}>
                                刪除
                            </button>
                        </td>
                    </tr>
                ))}
                {props.list.length === 0 && (
                    <tr>
                        <td className="p-4 text-gray-500" colSpan={6}>
                            尚無資料
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

/** ====== 子面板：Reports ====== */
function ReportsPanel(props: {
    list: KpiReportDto[];
    onAdd: (dto: KpiReportUpsertDto) => void | Promise<void> | Promise<string | undefined>;
    onUpdate: (id: number, dto: KpiReportUpsertDto) => void | Promise<void>;
    onDelete: (id: number) => void | Promise<void>;
    onChangeStatus: (id: number, newStatus: number) => void | Promise<void>;
}) {
    const [draft, setDraft] = React.useState<KpiReportUpsertDto>({
        year: new Date().getFullYear(),
        period: "Q2",
        kpiReportValue: null,
        isSkipped: false,
        remarks: "",
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <input
                    className="border rounded px-2 py-1 w-24"
                    type="number"
                    value={draft.year}
                    onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) || new Date().getFullYear() }))}
                />
                <select
                    className="border rounded px-2 py-1"
                    value={draft.period}
                    onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))}
                >
                    <option value="Q2">{quarterHelper.getQuarterLabel('Q2')}</option>
                    <option value="Q4">{quarterHelper.getQuarterLabel('Q4')}</option>
                    <option value="H1">H1</option>
                    <option value="Y">Y</option>
                </select>
                <input
                    className="border rounded px-2 py-1 w-28"
                    placeholder="數值"
                    value={draft.kpiReportValue ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, kpiReportValue: e.target.value ? Number(e.target.value) : null }))}
                />
                <label className="inline-flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={draft.isSkipped}
                        onChange={(e) => setDraft((d) => ({ ...d, isSkipped: e.target.checked }))}
                    />
                    本期不適用
                </label>
                <input
                    className="border rounded px-2 py-1 w-40"
                    placeholder="備註"
                    value={draft.remarks ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                />
                <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={() => props.onAdd(draft)}>
                    新增
                </button>
            </div>

            <table className="w-full text-sm">
                <thead>
                <tr className="bg-gray-50">
                    <th className="p-2">年度</th>
                    <th className="p-2">期別</th>
                    <th className="p-2">值</th>
                    <th className="p-2">狀態</th>
                    <th className="p-2 text-right">操作</th>
                </tr>
                </thead>
                <tbody>
                {props.list.map((r) => (
                    <tr key={r.id} className="border-t">
                        <td className="p-2 text-center">{r.year}</td>
                        <td className="p-2 text-center">{quarterHelper.getQuarterLabel(r.period)}</td>
                        <td className="p-2 text-right">{r.kpiReportValue ?? "-"}</td>
                        <td className="p-2">
                            <select className="border rounded px-2 py-1" value={r.status} onChange={(e) => props.onChangeStatus(r.id, Number(e.target.value))}>
                                <option value={0}>Draft</option>
                                <option value={1}>Submitted</option>
                                <option value={2}>Reviewed</option>
                                <option value={3}>Returned</option>
                                <option value={4}>Finalized</option>
                            </select>
                        </td>
                        <td className="p-2 text-right">
                            <button
                                className="text-indigo-600 mr-3"
                                onClick={() =>
                                    props.onUpdate(r.id, {
                                        year: r.year,
                                        period: r.period,
                                        kpiReportValue: r.kpiReportValue ?? null,
                                        isSkipped: r.isSkipped,
                                        remarks: r.remarks ?? "",
                                    })
                                }
                            >
                                編輯
                            </button>
                            <button className="text-red-600" onClick={() => props.onDelete(r.id)}>
                                刪除
                            </button>
                        </td>
                    </tr>
                ))}
                {props.list.length === 0 && (
                    <tr>
                        <td className="p-4 text-gray-500" colSpan={5}>
                            尚無報告
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

/** ====== 小元件 ====== */
function LabeledInput({
                          label,
                          value,
                          onChange,
                          type = "text",
                      }: {
    label: string;
    value: any;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <label className="text-sm">
            <div className="text-gray-600 mb-1">{label}</div>
            <input className="border rounded px-3 py-2 w-full" value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type} />
        </label>
    );
}
