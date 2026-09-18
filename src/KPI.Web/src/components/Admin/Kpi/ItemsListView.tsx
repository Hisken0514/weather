"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/apiService";
import { parseUtc } from "@/utils/timetool";
import { toast } from "react-hot-toast";
import { Search, Plus, Filter } from "lucide-react";
import { getAccessToken } from "@/services/serverAuthService";
import { X } from "lucide-react";

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

// 和後端對齊的 Row DTO（精簡）
export type KpiItemRowDto = {
    id: number;
    indicatorNumber: number;
    kpiCategoryId: number;
    kpiFieldId: number;
    kpiFieldName: string;
    organizationId?: number | null;
    organizationName?: string | null;
    displayName: string;
    detailCount: number;
    createTime: string;
};

type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export default function ItemsListView({
                                          onSelect,
                                          onCreate,
                                      }: {
    onSelect: (id: number) => void;
    onCreate?: (createdId: number) => void;
}) {
    const [rows, setRows] = useState<KpiItemRowDto[]>([]);
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [total, setTotal] = useState(0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const params = useMemo(() => {
        const p: any = { page, pageSize };
        if (q.trim()) p.q = q.trim();
        return p;
    }, [page, pageSize, q]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get<PagedResult<KpiItemRowDto>>(
                "/Admin/kpi/items",
                { params, ...(await authHeaders()) }
            );
            setRows(data.items ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) {
            console.error(e);
            toast.error("讀取指標項目失敗");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(params)]);

    // 新增一個 item
    const onCreateItem = () => setShowCreate(true);

    // 建立成功的回呼（Modal 會呼叫）
    const handleCreated = async (newId: number) => {
        toast.success("已建立新指標");
        setShowCreate(false);
        onCreate?.(newId);
        onSelect(newId);
        setPage(1);
        await load(); // 重新載入清單
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">指標項目</h3>
                <button
                    onClick={onCreateItem}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    新增
                </button>
            </div>
            {/* ➋ 新增：建立指標 Modal */}
            {showCreate && (
                <CreateItemModal
                    onCancel={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}
            {/* 搜尋列 */}
            <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                        }}
                        placeholder="搜尋指標名稱/領域/公司..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    onClick={load}
                    disabled={loading}
                    title="套用"
                >
                    <Filter className="w-4 h-4" />
                    套用
                </button>
            </div>

            {/* 列表 */}
            <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">顯示名稱</th>
                        <th className="px-3 py-2 text-left">領域</th>
                        <th className="px-3 py-2 text-left">公司/組織</th>
                        <th className="px-3 py-2 text-left">細項數</th>
                        <th className="px-3 py-2 text-left">建立時間</th>
                        <th className="px-3 py-2 text-center">操作</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {rows.map((x) => (
                        <tr key={x.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{x.id}</td>
                            <td className="px-3 py-2">{x.displayName}</td>
                            <td className="px-3 py-2">{x.kpiFieldName}</td>
                            <td className="px-3 py-2">
                                {x.organizationName ?? <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-3 py-2">{x.detailCount}</td>
                            <td className="px-3 py-2">
                                {parseUtc(x.createTime).toLocaleString("zh-TW", { hour12: false })}
                            </td>
                            <td className="px-3 py-2 text-center">
                                <button
                                    onClick={() => onSelect(x.id)}
                                    className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                                >
                                    編輯
                                </button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                                無資料
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* 分頁 */}
            <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                <div>共 {total} 筆，頁 {page} / {totalPages}</div>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1 border rounded disabled:opacity-50"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                    >
                        上一頁
                    </button>
                    <button
                        className="px-3 py-1 border rounded disabled:opacity-50"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                    >
                        下一頁
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateItemModal({
                             onCancel,
                             onCreated,
                         }: {
    onCancel: () => void;
    onCreated: (newId: number) => void;
}) {
    const [indicatorNumber, setIndicatorNumber] = useState<number>(1);
    const [kpiCategoryId, setKpiCategoryId] = useState<number>(0); // 0=基礎, 1=客製, 2=麥寮(示例)
    const [kpiFieldId, setKpiFieldId] = useState<number>(0);
    const [organizationId, setOrganizationId] = useState<number | "">("");
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        if (!indicatorNumber || indicatorNumber < 1) {
            toast.error("指標編號必須為正整數");
            return false;
        }
        if (!kpiFieldId || kpiFieldId < 1) {
            toast.error("請輸入有效的領域 KpiFieldId（>=1）");
            return false;
        }
        return true;
    };

    const onSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload = {
                indicatorNumber,
                kpiCategoryId,
                kpiFieldId,
                organizationId: organizationId === "" ? null : Number(organizationId),
            };
            const { data } = await api.post<{ id: number }>(
                "/Admin/kpi/items",
                payload,
                await authHeaders()
            );
            onCreated(data.id);
        } catch (e: any) {
            console.error(e);
            toast.error(e?.response?.data?.message ?? "建立失敗");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-xl shadow p-6 w-[560px]">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">建立指標</h3>
                    <button onClick={onCancel} className="p-2 rounded hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <label className="flex flex-col">
                        <span className="text-gray-600">指標編號 *</span>
                        <input
                            type="number"
                            value={indicatorNumber}
                            onChange={(e) =>
                                setIndicatorNumber(parseInt(e.target.value || "0", 10))
                            }
                            className="border rounded px-2 py-1"
                            min={1}
                        />
                    </label>

                    <label className="flex flex-col">
                        <span className="text-gray-600">指標類別 *</span>
                        <select
                            value={kpiCategoryId}
                            onChange={(e) => setKpiCategoryId(parseInt(e.target.value, 10))}
                            className="border rounded px-2 py-1"
                        >
                            <option value={0}>基礎型 (0)</option>
                            <option value={1}>客製型 (1)</option>
                            <option value={2}>麥寮專用 (2)</option>
                        </select>
                    </label>

                    <label className="flex flex-col">
                        <span className="text-gray-600">領域 KpiFieldId *</span>
                        <input
                            type="number"
                            value={kpiFieldId}
                            onChange={(e) =>
                                setKpiFieldId(parseInt(e.target.value || "0", 10))
                            }
                            className="border rounded px-2 py-1"
                            placeholder="請輸入現有的 KpiField Id"
                            min={1}
                        />
                    </label>

                    <label className="flex flex-col">
                        <span className="text-gray-600">OrganizationId（可空）</span>
                        <input
                            type="number"
                            value={organizationId}
                            onChange={(e) =>
                                setOrganizationId(
                                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                                )
                            }
                            className="border rounded px-2 py-1"
                            placeholder="留白表示無"
                            min={1}
                        />
                    </label>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                        disabled={submitting}
                    >
                        取消
                    </button>
                    <button
                        onClick={onSubmit}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        disabled={submitting}
                    >
                        建立
                    </button>
                </div>
            </div>
        </div>
    );
}