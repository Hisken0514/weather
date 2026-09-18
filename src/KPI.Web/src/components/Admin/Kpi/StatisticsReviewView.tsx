"use client";
import React from "react";
import api from "@/services/apiService";
import { parseUtc } from "@/utils/timetool";
import { toast } from "react-hot-toast";
import { getAccessToken } from "@/services/serverAuthService";
import { useCan } from "@/hooks/useCan";
import { quarterHelper } from "@/helpers/quarter";

type ReportRow = {
    id: number;
    kpiDataId: number;
    organizationId: number | null;
    organizationName: string | null;
    indicatorNumber: string | null;
    indicatorName: string | null;
    detailItemName: string | null;
    field: string | null;
    year: number;
    period: string;
    value: number | null;
    isSkipped: boolean;
    remarks: string | null;
    status: string;
    createdAt: string | null;
    updateAt: string | null;
};

const STATUS_TABS = [
    { label: "全部", value: undefined },
    { label: "待審核", value: 1 },
    { label: "已核准", value: 4 },
    { label: "已退回", value: 3 },
] as const;

const STATUS_LABEL: Record<string, string> = {
    Draft: "草稿",
    Submitted: "待審核",
    Reviewed: "已審閱",
    Returned: "已退回",
    Finalized: "已核准",
};

const STATUS_BADGE: Record<string, string> = {
    Draft: "badge badge-ghost",
    Submitted: "badge badge-warning",
    Reviewed: "badge badge-info",
    Returned: "badge badge-error",
    Finalized: "badge badge-success",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function StatisticsReviewView() {
    const { can } = useCan();
    const canApprove = can("kpi-approve");

    const [rows, setRows] = React.useState<ReportRow[]>([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<number | undefined>(1);
    const [filterYear, setFilterYear] = React.useState<string>("");
    const [filterPeriod, setFilterPeriod] = React.useState<string>("");
    const [filterOrgName, setFilterOrgName] = React.useState<string>("");
    const [filterField, setFilterField] = React.useState<string>("");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(50);
    const [processingId, setProcessingId] = React.useState<number | null>(null);
    const [batchProcessing, setBatchProcessing] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const authHeaders = React.useCallback(async () => {
        const t = await getAccessToken();
        return { headers: { Authorization: t ? `Bearer ${t.value}` : "" } };
    }, []);

    const load = React.useCallback(async (targetPage = page) => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const params: Record<string, string | number> = {
                page: targetPage,
                pageSize,
            };
            if (activeTab !== undefined) params.status = activeTab;
            if (filterYear) params.year = Number(filterYear);
            if (filterPeriod) params.period = filterPeriod;
            if (filterOrgName) params.orgName = filterOrgName;
            if (filterField) params.field = filterField;

            const { data } = await api.get<{ success: boolean; data: { items: ReportRow[]; total: number } }>(
                "/Admin/kpi/reports",
                { ...(await authHeaders()), params }
            );
            setRows(data.data?.items ?? []);
            setTotalCount(data.data?.total ?? 0);
        } catch {
            toast.error("載入失敗");
        } finally {
            setLoading(false);
        }
    }, [activeTab, filterYear, filterPeriod, filterOrgName, filterField, page, pageSize, authHeaders]);

    // 切換 tab / pageSize 時重設至第一頁
    const handleTabChange = (val: number | undefined) => {
        setActiveTab(val);
        setPage(1);
    };
    const handlePageSizeChange = (val: number) => {
        setPageSize(val);
        setPage(1);
    };
    const handleSearch = () => {
        setPage(1);
        load(1);
    };

    React.useEffect(() => {
        load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, pageSize]);

    // 目前頁面中狀態為 Submitted 的 id（批量選取範圍）
    const submittedIds = React.useMemo(
        () => rows.filter((r) => r.status === "Submitted").map((r) => r.id),
        [rows]
    );

    const allSelected =
        submittedIds.length > 0 && submittedIds.every((id) => selectedIds.has(id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                submittedIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                submittedIds.forEach((id) => next.add(id));
                return next;
            });
        }
    };

    const toggleRow = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    const changeStatus = async (id: number, newStatus: number, label: string) => {
        setProcessingId(id);
        try {
            await api.patch(
                `/Admin/kpi/reports/${id}/status`,
                { newStatus },
                await authHeaders()
            );
            toast.success(`已${label}`);
            load(page);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail ?? `操作失敗`);
        } finally {
            setProcessingId(null);
        }
    };

    const batchChangeStatus = async (newStatus: number, label: string) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        setBatchProcessing(true);
        try {
            await api.post(
                "/Admin/kpi/reports/batch-status",
                { ids, newStatus },
                await authHeaders()
            );
            toast.success(`已批量${label} ${ids.length} 筆`);
            load(page);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "批量操作失敗");
        } finally {
            setBatchProcessing(false);
        }
    };

    const selectedCount = selectedIds.size;

    // ===== 批量退回已核准 Modal =====
    const [revokeOpen, setRevokeOpen] = React.useState(false);
    const [revokeYear, setRevokeYear] = React.useState(filterYear);
    const [revokePeriod, setRevokePeriod] = React.useState(filterPeriod);
    const [revokeOrgId, setRevokeOrgId] = React.useState("");
    const [revokeProcessing, setRevokeProcessing] = React.useState(false);

    type OrgOption = { id: number; name: string; depth: number };
    const [orgOptions, setOrgOptions] = React.useState<OrgOption[]>([]);

    React.useEffect(() => {
        const fetchOrgs = async () => {
            try {
                type TreeNode = { id: number; name: string; children?: TreeNode[] };
                const { data } = await api.get<TreeNode[]>("/Admin/org/tree", await authHeaders());
                const flat: OrgOption[] = [];
                const traverse = (nodes: TreeNode[], depth: number) => {
                    for (const n of nodes) {
                        flat.push({ id: n.id, name: n.name, depth });
                        if (n.children?.length) traverse(n.children, depth + 1);
                    }
                };
                traverse(data, 0);
                setOrgOptions(flat);
            } catch {
                // non-critical
            }
        };
        fetchOrgs();
    }, [authHeaders]);

    const openRevokeModal = () => {
        setRevokeYear(filterYear);
        setRevokePeriod(filterPeriod);
        setRevokeOrgId("");
        setRevokeOpen(true);
    };

    const confirmRevoke = async () => {
        if (!revokeYear || !revokePeriod) {
            toast.error("請選擇年度與季度");
            return;
        }
        if (!confirm(`確定要將 ${revokeYear} 年 ${revokePeriod} 的所有已核准報告退回？\n此操作將把狀態改為「已退回」，公司需重新送審。`)) return;

        setRevokeProcessing(true);
        try {
            const body: Record<string, any> = { year: Number(revokeYear), period: revokePeriod };
            if (revokeOrgId) body.organizationId = Number(revokeOrgId);

            const { data } = await api.post<{ count: number }>(
                "/Admin/kpi/reports/batch-revoke-finalized",
                body,
                await authHeaders()
            );
            toast.success(`已退回 ${data.count} 筆已核准報告`);
            setRevokeOpen(false);
            load(page);
        } catch (e: any) {
            toast.error(e?.response?.data?.detail ?? "退回失敗");
        } finally {
            setRevokeProcessing(false);
        }
    };

    const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">達標統計與審核</h3>
                {canApprove && (
                    <button
                        className="btn btn-sm btn-warning"
                        onClick={openRevokeModal}
                    >
                        批量退回已核准批次
                    </button>
                )}
            </div>

            {/* Tab 切換 */}
            <div role="tablist" className="tabs tabs-boxed w-fit">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={String(tab.value)}
                        role="tab"
                        className={`tab ${activeTab === tab.value ? "tab-active" : ""}`}
                        onClick={() => handleTabChange(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 篩選列 */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="label label-text text-xs">年度</label>
                    <input
                        type="number"
                        placeholder="例：114"
                        className="input input-bordered input-sm w-28"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <div>
                    <label className="label label-text text-xs">季度</label>
                    <select
                        className="select select-bordered select-sm w-28"
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value)}
                    >
                        <option value="">全部</option>
                        {["Q2", "Q4", "H1", "Y"].map((p) => (
                            <option key={p} value={p}>{quarterHelper.getQuarterLabel(p)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label label-text text-xs">公司名稱</label>
                    <input
                        type="text"
                        placeholder="關鍵字篩選"
                        className="input input-bordered input-sm w-36"
                        value={filterOrgName}
                        onChange={(e) => setFilterOrgName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <div>
                    <label className="label label-text text-xs">領域</label>
                    <input
                        type="text"
                        placeholder="關鍵字篩選"
                        className="input input-bordered input-sm w-28"
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <button className="btn btn-sm btn-primary" onClick={handleSearch}>
                    查詢
                </button>
            </div>

            {/* 批量操作列（有選取時才顯示） */}
            {canApprove && selectedCount > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-blue-700 font-medium">
                        已選取 {selectedCount} 筆
                    </span>
                    <button
                        className="btn btn-xs btn-success"
                        disabled={batchProcessing}
                        onClick={() => batchChangeStatus(4, "核准")}
                    >
                        批量核准
                    </button>
                    <button
                        className="btn btn-xs btn-error"
                        disabled={batchProcessing}
                        onClick={() => batchChangeStatus(3, "退回")}
                    >
                        批量退回
                    </button>
                    <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        取消選取
                    </button>
                </div>
            )}

            {/* 表格 */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-10 text-center text-gray-400">載入中…</div>
                ) : rows.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">無資料</div>
                ) : (
                    <table className="table table-sm w-full">
                        <thead>
                        <tr>
                            {canApprove && (
                                <th className="w-8">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-xs"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        title="全選待審核項目"
                                        disabled={submittedIds.length === 0}
                                    />
                                </th>
                            )}
                            <th>組織</th>
                            <th>領域</th>
                            <th>指標編號</th>
                            <th>指標名稱</th>
                            <th>細項名稱</th>
                            <th>年度</th>
                            <th>季度</th>
                            <th>填報值</th>
                            <th>備註</th>
                            <th>狀態</th>
                            <th>送出時間</th>
                            {canApprove && <th>操作</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="hover">
                                {canApprove && (
                                    <td>
                                        {row.status === "Submitted" && (
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs"
                                                checked={selectedIds.has(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                            />
                                        )}
                                    </td>
                                )}
                                <td className="whitespace-nowrap">{row.organizationName ?? "—"}</td>
                                <td className="whitespace-nowrap">{row.field ?? "—"}</td>
                                <td>{row.indicatorNumber ?? "—"}</td>
                                <td className="max-w-[160px] truncate" title={row.indicatorName ?? ""}>
                                    {row.indicatorName ?? "—"}
                                </td>
                                <td className="max-w-[120px] truncate" title={row.detailItemName ?? ""}>
                                    {row.detailItemName ?? "—"}
                                </td>
                                <td>{row.year}</td>
                                <td>{quarterHelper.getQuarterLabel(row.period)}</td>
                                <td>
                                    {row.isSkipped ? (
                                        <span className="text-gray-400 text-xs">不適用</span>
                                    ) : (
                                        row.value ?? "—"
                                    )}
                                </td>
                                <td className="max-w-[120px] truncate text-xs text-gray-500" title={row.remarks ?? ""}>
                                    {row.remarks ?? "—"}
                                </td>
                                <td>
                                    <span className={STATUS_BADGE[row.status] ?? "badge"}>
                                        {STATUS_LABEL[row.status] ?? row.status}
                                    </span>
                                </td>
                                <td className="text-xs whitespace-nowrap text-gray-500">
                                    {row.updateAt
                                        ? parseUtc(row.updateAt).toLocaleString("zh-TW", { hour12: false })
                                        : "—"}
                                </td>
                                {canApprove && (
                                    <td>
                                        {row.status === "Submitted" && (
                                            <div className="flex gap-1">
                                                <button
                                                    className="btn btn-xs btn-success"
                                                    disabled={processingId === row.id}
                                                    onClick={() => changeStatus(row.id, 4, "核准")}
                                                >
                                                    核准
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-error"
                                                    disabled={processingId === row.id}
                                                    onClick={() => changeStatus(row.id, 3, "退回")}
                                                >
                                                    退回
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 分頁控制列 */}
            {!loading && totalCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-base-200">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>顯示第 {startItem}–{endItem} 筆，共 {totalCount} 筆</span>
                        <select
                            className="select select-bordered select-xs"
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>每頁 {n} 筆</option>
                            ))}
                        </select>
                    </div>

                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage(1)}
                        >«</button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage((p) => p - 1)}
                        >‹</button>
                        <button className="join-item btn btn-sm btn-active pointer-events-none">
                            {page} / {totalPages}
                        </button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage((p) => p + 1)}
                        >›</button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(totalPages)}
                        >»</button>
                    </div>
                </div>
            )}

            {/* 批量退回已核准 Modal */}
            {revokeOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setRevokeOpen(false); }}
                >
                    <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 space-y-4">
                        <h4 className="text-base font-semibold text-gray-800">批量退回已核准批次</h4>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                            此操作會將指定年度、季度的所有「已核准」報告強制退回，公司需重新送審。
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label label-text text-xs">年度 *</label>
                                <input
                                    type="number"
                                    placeholder="例：114"
                                    className="input input-bordered input-sm w-full"
                                    value={revokeYear}
                                    onChange={(e) => setRevokeYear(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label label-text text-xs">季度 *</label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={revokePeriod}
                                    onChange={(e) => setRevokePeriod(e.target.value)}
                                >
                                    <option value="">請選擇</option>
                                    {["Q2", "Q4", "H1", "Y"].map((p) => (
                                        <option key={p} value={p}>{quarterHelper.getQuarterLabel(p)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label label-text text-xs">限定機構（留空代表全部）</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={revokeOrgId}
                                onChange={(e) => setRevokeOrgId(e.target.value)}
                            >
                                <option value="">全部機構</option>
                                {orgOptions.map((o) => (
                                    <option key={o.id} value={o.id}>{"　".repeat(o.depth)}{o.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setRevokeOpen(false)}
                                disabled={revokeProcessing}
                            >
                                取消
                            </button>
                            <button
                                className="btn btn-sm btn-warning"
                                disabled={!revokeYear || !revokePeriod || revokeProcessing}
                                onClick={confirmRevoke}
                            >
                                {revokeProcessing ? "處理中…" : "確認退回"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
