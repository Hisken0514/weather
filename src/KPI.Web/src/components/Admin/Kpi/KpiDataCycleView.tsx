"use client";
import React from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { toast } from "react-hot-toast";

type CycleOption = { id: number; name: string };
type OrgOption = { id: number; name: string; depth: number };
type TreeNode = { id: number; name: string; children?: TreeNode[] };

type KpiDataRow = {
    id: number;
    organizationId: number | null;
    organizationName: string | null;
    kpiCycleId: number | null;
    cycleName: string | null;
    field: string;
    indicatorNumber: number;
    itemName: string;
    detailItemName: string;
    unit: string;
    productionSite: string | null;
    baselineYear: string;
    baselineValue: number | null;
    targetValue: number | null;
    reportCount: number;
};

function flattenTree(nodes: TreeNode[], depth = 0): OrgOption[] {
    const result: OrgOption[] = [];
    for (const n of nodes) {
        result.push({ id: n.id, name: n.name, depth });
        if (n.children?.length) result.push(...flattenTree(n.children, depth + 1));
    }
    return result;
}

const PAGE_SIZE = 50;

export default function KpiDataCycleView() {
    const [rows, setRows] = React.useState<KpiDataRow[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [loading, setLoading] = React.useState(false);

    const [orgs, setOrgs] = React.useState<OrgOption[]>([]);
    const [cycles, setCycles] = React.useState<CycleOption[]>([]);

    const [filterOrg, setFilterOrg] = React.useState("");
    const [filterCycle, setFilterCycle] = React.useState("");
    const [noCycleOnly, setNoCycleOnly] = React.useState(false);
    const [filterQ, setFilterQ] = React.useState("");

    const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
    const [targetCycleId, setTargetCycleId] = React.useState("");
    const [reassigning, setReassigning] = React.useState(false);

    const authHeaders = React.useCallback(async () => {
        const t = await getAccessToken();
        return { Authorization: t ? `Bearer ${t.value}` : "" };
    }, []);

    // 載入下拉選單
    React.useEffect(() => {
        const load = async () => {
            const headers = await authHeaders();
            const [orgRes, cycleRes] = await Promise.all([
                api.get<TreeNode[]>("/Admin/org/tree", { headers }),
                api.get<{ id: number; name: string }[]>("/Admin/kpi/cycles", { headers }),
            ]);
            setOrgs(flattenTree(orgRes.data));
            setCycles(cycleRes.data.map(c => ({ id: c.id, name: c.name })));
        };
        load().catch(() => toast.error("載入下拉清單失敗"));
    }, [authHeaders]);

    const load = React.useCallback(async (targetPage = 1) => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const headers = await authHeaders();
            const params: Record<string, string | number | boolean> = {
                page: targetPage, pageSize: PAGE_SIZE,
            };
            if (filterOrg) params.orgId = Number(filterOrg);
            if (!noCycleOnly && filterCycle) params.cycleId = Number(filterCycle);
            if (noCycleOnly) params.noCycleOnly = true;
            if (filterQ.trim()) params.q = filterQ.trim();

            const { data } = await api.get<{
                success: boolean;
                data: { items: KpiDataRow[]; total: number };
            }>("/Admin/kpi/data-list", { headers, params });

            setRows(data.data?.items ?? []);
            setTotal(data.data?.total ?? 0);
            setPage(targetPage);
        } catch {
            toast.error("載入失敗");
        } finally {
            setLoading(false);
        }
    }, [authHeaders, filterOrg, filterCycle, noCycleOnly, filterQ]);

    const handleSearch = () => load(1);

    const toggleAll = () => {
        if (selectedIds.size === rows.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(rows.map(r => r.id)));
    };

    const toggleRow = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleReassign = async () => {
        if (selectedIds.size === 0) { toast.error("請至少勾選一筆"); return; }
        const newCycleId = targetCycleId ? Number(targetCycleId) : null;
        const label = newCycleId
            ? cycles.find(c => c.id === newCycleId)?.name ?? `週期 #${newCycleId}`
            : "清除週期（設為無）";

        if (!confirm(`確定要將選取的 ${selectedIds.size} 筆 KPI 資料的週期改為「${label}」？`)) return;

        setReassigning(true);
        try {
            const headers = await authHeaders();
            const { data } = await api.patch<{ count: number }>(
                "/Admin/kpi/data/batch-reassign-cycle",
                { kpiDataIds: Array.from(selectedIds), newCycleId },
                { headers }
            );
            toast.success(`已更新 ${data.count} 筆`);
            load(page);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "更新失敗");
        } finally {
            setReassigning(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">KPI 資料週期校正</h3>
            <p className="text-sm text-gray-500">
                篩選出 KpiData 清單，勾選後批量指定正確的週期。適用於資料匯入時 KpiCycle 填錯的情況。
            </p>

            {/* 篩選列 */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="label label-text text-xs">機構</label>
                    <select className="select select-bordered select-sm w-48"
                        value={filterOrg} onChange={e => setFilterOrg(e.target.value)}>
                        <option value="">全部機構</option>
                        {orgs.map(o => (
                            <option key={o.id} value={o.id}>
                                {"　".repeat(o.depth)}{o.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label label-text text-xs">目前週期</label>
                    <select className="select select-bordered select-sm w-48"
                        value={filterCycle} onChange={e => setFilterCycle(e.target.value)}
                        disabled={noCycleOnly}>
                        <option value="">全部週期</option>
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 pt-4">
                    <input type="checkbox" className="checkbox checkbox-sm"
                        checked={noCycleOnly} onChange={e => setNoCycleOnly(e.target.checked)} />
                    <span className="text-sm">只看未指定週期</span>
                </div>
                <div>
                    <label className="label label-text text-xs">關鍵字</label>
                    <input type="text" className="input input-bordered input-sm w-40"
                        placeholder="領域/指標名稱..."
                        value={filterQ} onChange={e => setFilterQ(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()} />
                </div>
                <button className="btn btn-sm btn-primary" onClick={handleSearch}>查詢</button>
            </div>

            {/* 批量操作列 */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-amber-800">
                        已選 {selectedIds.size} 筆，移至週期：
                    </span>
                    <select className="select select-bordered select-sm w-52"
                        value={targetCycleId} onChange={e => setTargetCycleId(e.target.value)}>
                        <option value="">—— 清除（設為無週期）</option>
                        {cycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-sm btn-warning"
                        disabled={reassigning} onClick={handleReassign}>
                        {reassigning && <span className="loading loading-spinner loading-xs mr-1" />}
                        確認搬移
                    </button>
                    <button className="btn btn-sm btn-ghost"
                        onClick={() => setSelectedIds(new Set())}>
                        取消選取
                    </button>
                </div>
            )}

            {/* 表格 */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-10 text-center text-gray-400">載入中…</div>
                ) : rows.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">無資料，請點查詢</div>
                ) : (
                    <table className="table table-sm w-full">
                        <thead>
                            <tr>
                                <th className="w-8">
                                    <input type="checkbox" className="checkbox checkbox-xs"
                                        checked={rows.length > 0 && selectedIds.size === rows.length}
                                        onChange={toggleAll} />
                                </th>
                                <th>機構</th>
                                <th>目前週期</th>
                                <th>領域</th>
                                <th>指標名稱</th>
                                <th>細項名稱</th>
                                <th>單位</th>
                                <th>工場/製程區</th>
                                <th>基準年</th>
                                <th>基準值</th>
                                <th>目標值</th>
                                <th>填報筆數</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className={`hover ${selectedIds.has(r.id) ? "bg-blue-50" : ""}`}>
                                    <td>
                                        <input type="checkbox" className="checkbox checkbox-xs"
                                            checked={selectedIds.has(r.id)}
                                            onChange={() => toggleRow(r.id)} />
                                    </td>
                                    <td className="whitespace-nowrap">{r.organizationName ?? "—"}</td>
                                    <td>
                                        {r.cycleName
                                            ? <span className="badge badge-info badge-sm">{r.cycleName}</span>
                                            : <span className="badge badge-ghost badge-sm text-gray-400">無</span>}
                                    </td>
                                    <td>{r.field}</td>
                                    <td className="max-w-[160px] truncate" title={r.itemName}>{r.itemName}</td>
                                    <td className="max-w-[120px] truncate" title={r.detailItemName}>{r.detailItemName}</td>
                                    <td>{r.unit}</td>
                                    <td>{r.productionSite ?? "—"}</td>
                                    <td>{r.baselineYear}</td>
                                    <td>{r.baselineValue ?? "—"}</td>
                                    <td>{r.targetValue ?? "—"}</td>
                                    <td>
                                        <span className={`badge badge-sm ${r.reportCount > 0 ? "badge-neutral" : "badge-ghost text-gray-400"}`}>
                                            {r.reportCount}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 分頁 */}
            {!loading && total > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-base-200 text-sm text-gray-500">
                    <span>共 {total} 筆</span>
                    <div className="join">
                        <button className="join-item btn btn-sm" disabled={page <= 1}
                            onClick={() => load(page - 1)}>‹</button>
                        <button className="join-item btn btn-sm btn-active pointer-events-none">
                            {page} / {totalPages}
                        </button>
                        <button className="join-item btn btn-sm" disabled={page >= totalPages}
                            onClick={() => load(page + 1)}>›</button>
                    </div>
                </div>
            )}
        </div>
    );
}
