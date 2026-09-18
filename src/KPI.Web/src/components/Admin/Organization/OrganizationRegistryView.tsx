"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/services/apiService";
import { Edit3, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { getAccessToken } from "@/services/serverAuthService";
import { toast, Toaster } from "react-hot-toast";

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

type OrgRow = {
    id: number;
    name: string;
    typeCode: string;
    isActive: boolean;
    code?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    taxId?: string | null;
    parentId?: number | null;
    depth?: number;
    children?: OrgRow[];
};

type OrgUpsert = {
    name: string;
    typeId: number;
    parentId?: number | null;
    code?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    taxId?: string | null;
    isActive?: boolean;
    useParentDomainVerification?: boolean;
};

type OrgTypeOption = {
    id: number;
    typeCode: string;
    typeName: string;
};

export default function OrganizationRegistryView() {
    const [tree, setTree] = useState<OrgRow[]>([]);
    const [orgTypes, setOrgTypes] = useState<OrgTypeOption[]>([]);
    const [loading, setLoading] = useState(false);

    const [q, setQ] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("");
    const [onlyActive, setOnlyActive] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const [editing, setEditing] = useState<OrgRow | null>(null);
    const [showModal, setShowModal] = useState(false);

    const loadTree = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<OrgRow[]>("/Admin/org/tree", await authHeaders());
            setTree(data);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTypes = useCallback(async () => {
        try {
            const { data } = await api.get<OrgTypeOption[]>("/Admin/org/types", await authHeaders());
            setOrgTypes(data);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadTree(); loadTypes(); }, [loadTree, loadTypes]);

    // 攤平樹狀資料（含 depth 縮排與 parentId）
    const flat = useMemo(() => {
        const acc: OrgRow[] = [];
        const walk = (nodes: OrgRow[], parentId: number | null, depth: number) => {
            nodes.forEach(n => {
                acc.push({ ...n, parentId, depth });
                if (n.children?.length) walk(n.children, n.id, depth + 1);
            });
        };
        walk(tree, null, 0);
        return acc;
    }, [tree]);

    const filtered = useMemo(() => flat.filter(n => {
        const hitQ = !q || `${n.name} ${n.code ?? ""}`.toLowerCase().includes(q.toLowerCase());
        const hitType = !typeFilter || n.typeCode === typeFilter;
        const hitActive = !onlyActive || n.isActive;
        return hitQ && hitType && hitActive;
    }), [flat, q, typeFilter, onlyActive]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
    const pageRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const onDelete = async (row: OrgRow) => {
        if (!confirm(`確定刪除「${row.name}」？`)) return;
        try {
            await api.delete(`/Admin/org/${row.id}`, await authHeaders());
            toast.success(`已刪除「${row.name}」`);
            await loadTree();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? e.message ?? "刪除失敗");
        }
    };

    const openCreate = () => { setEditing(null); setShowModal(true); };
    const openEdit = (r: OrgRow) => { setEditing(r); setShowModal(true); };

    const typeNameOf = (typeCode: string) =>
        orgTypes.find(t => t.typeCode === typeCode)?.typeName ?? typeCode;

    return (
        <div className="space-y-4">
            <Toaster position="top-right" />
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">企業/公司/工廠維護</h3>
                <div className="flex gap-2">
                    <button onClick={loadTree} className="px-3 py-2 border rounded-lg flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> 重新整理
                    </button>
                    <button onClick={openCreate} className="px-3 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                        <Plus className="w-4 h-4" /> 新增
                    </button>
                </div>
            </div>

            {/* 篩選列 */}
            <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="搜尋名稱 / 代碼"
                        className="w-full pl-9 pr-3 py-2 border rounded-lg"
                    />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="">全部類型</option>
                    {orgTypes.map(t => (
                        <option key={t.id} value={t.typeCode}>{t.typeName}</option>
                    ))}
                </select>
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                    <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
                    只顯示啟用
                </label>
            </div>

            {/* 表格 */}
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">名稱</th>
                        <th className="px-4 py-2 text-left">類型</th>
                        <th className="px-4 py-2 text-left">代碼</th>
                        <th className="px-4 py-2 text-left">聯絡人</th>
                        <th className="px-4 py-2 text-left">電話</th>
                        <th className="px-4 py-2 text-left">狀態</th>
                        <th className="px-4 py-2 text-center">操作</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {pageRows.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                                <span className="text-gray-400">{Array(r.depth ?? 0).fill("—").join("")}</span>
                                <span className="ml-1">{r.name}</span>
                            </td>
                            <td className="px-4 py-2">{typeNameOf(r.typeCode)}</td>
                            <td className="px-4 py-2">{r.code ?? "-"}</td>
                            <td className="px-4 py-2">{r.contactPerson ?? "-"}</td>
                            <td className="px-4 py-2">{r.contactPhone ?? "-"}</td>
                            <td className="px-4 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${r.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600"}`}>
                                    {r.isActive ? "啟用" : "停用"}
                                </span>
                            </td>
                            <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-2">
                                    <button className="text-blue-600 hover:text-blue-700" onClick={() => openEdit(r)}><Edit3 size={18} /></button>
                                    <button className="text-red-600 hover:text-red-700" onClick={() => onDelete(r)}><Trash2 size={18} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {pageRows.length === 0 && !loading && (
                        <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={7}>查無資料</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* 分頁 */}
            <div className="flex items-center justify-between text-sm">
                <div>共 {total} 筆，頁 {page} / {totalPages}</div>
                <div className="flex gap-2">
                    <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一頁</button>
                    <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>下一頁</button>
                </div>
            </div>

            {/* Upsert Modal */}
            {showModal && (
                <OrgUpsertModal
                    orgTypes={orgTypes}
                    flatOrgs={flat}
                    editingId={editing?.id ?? null}
                    initial={editing ? {
                        name: editing.name,
                        typeId: orgTypes.find(t => t.typeCode === editing.typeCode)?.id ?? 0,
                        parentId: editing.parentId ?? null,
                        code: editing.code ?? "",
                        address: editing.address ?? "",
                        contactPerson: editing.contactPerson ?? "",
                        contactPhone: editing.contactPhone ?? "",
                        taxId: editing.taxId ?? "",
                        isActive: editing.isActive,
                    } : {
                        name: "", typeId: 0, parentId: null, isActive: true,
                    }}
                    onClose={() => setShowModal(false)}
                    onSubmit={async payload => {
                        try {
                            if (editing) {
                                await api.put(`/Admin/org/${editing.id}`, payload, await authHeaders());
                            } else {
                                await api.post(`/Admin/org`, payload, await authHeaders());
                            }
                            toast.success(editing ? "已更新組織資料" : "已新增組織");
                            setShowModal(false);
                            await loadTree();
                        } catch (e: any) {
                            toast.error(e?.response?.data?.message ?? e.message ?? "儲存失敗");
                        }
                    }}
                />
            )}
        </div>
    );
}

function OrgUpsertModal({
    orgTypes,
    flatOrgs,
    editingId,
    initial,
    onClose,
    onSubmit,
}: {
    orgTypes: OrgTypeOption[];
    flatOrgs: OrgRow[];
    editingId: number | null;
    initial: Partial<OrgUpsert>;
    onClose: () => void;
    onSubmit: (payload: OrgUpsert) => Promise<void>;
}) {
    const [form, setForm] = useState<OrgUpsert>({
        name: initial.name ?? "",
        typeId: initial.typeId ?? 0,
        parentId: initial.parentId ?? null,
        code: initial.code ?? "",
        address: initial.address ?? "",
        contactPerson: initial.contactPerson ?? "",
        contactPhone: initial.contactPhone ?? "",
        taxId: initial.taxId ?? "",
        isActive: initial.isActive ?? true,
        useParentDomainVerification: false,
    });
    const [saving, setSaving] = useState(false);

    const set = <K extends keyof OrgUpsert>(k: K, v: OrgUpsert[K]) =>
        setForm(f => ({ ...f, [k]: v }));

    // 上層組織下拉：排除自身及所有子孫，避免循環
    const parentOptions = useMemo(() => {
        if (editingId === null) return flatOrgs;
        const excluded = new Set<number>([editingId]);
        // 廣度優先收集子孫
        let queue = flatOrgs.filter(o => o.parentId === editingId).map(o => o.id);
        while (queue.length) {
            queue.forEach(id => excluded.add(id));
            queue = flatOrgs.filter(o => o.parentId != null && excluded.has(o.parentId) && !excluded.has(o.id)).map(o => o.id);
        }
        return flatOrgs.filter(o => !excluded.has(o.id));
    }, [flatOrgs, editingId]);

    // 用縮排前綴讓下拉選項呈現層級感
    const indent = (depth: number) => "\u00a0".repeat(depth * 3);

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-2xl rounded-lg shadow p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h4 className="text-lg font-semibold">{editingId !== null ? "編輯組織" : "新增組織"}</h4>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* 名稱 */}
                    <F label="名稱 *">
                        <input
                            value={form.name}
                            onChange={e => set("name", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="請輸入組織名稱"
                        />
                    </F>

                    {/* 類型 */}
                    <F label="類型 *">
                        <select
                            value={form.typeId || ""}
                            onChange={e => set("typeId", Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded bg-white"
                        >
                            <option value="" disabled>請選擇類型</option>
                            {orgTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.typeName}</option>
                            ))}
                        </select>
                    </F>

                    {/* 上層組織 */}
                    <F label="上層組織">
                        <select
                            value={form.parentId ?? ""}
                            onChange={e => set("parentId", e.target.value === "" ? null : Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded bg-white"
                        >
                            <option value="">（無，設為頂層）</option>
                            {parentOptions.map(o => (
                                <option key={o.id} value={o.id}>
                                    {indent(o.depth ?? 0)}{(o.depth ?? 0) > 0 ? "└ " : ""}{o.name}
                                </option>
                            ))}
                        </select>
                    </F>

                    {/* 代碼 */}
                    <F label="代碼（選填）">
                        <input
                            value={form.code ?? ""}
                            onChange={e => set("code", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="可留空"
                        />
                    </F>

                    {/* 地址（佔兩欄） */}
                    <F label="地址（選填）" wide>
                        <input
                            value={form.address ?? ""}
                            onChange={e => set("address", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="請輸入地址"
                        />
                    </F>

                    {/* 聯絡人 */}
                    <F label="聯絡人（選填）">
                        <input
                            value={form.contactPerson ?? ""}
                            onChange={e => set("contactPerson", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="請輸入聯絡人姓名"
                        />
                    </F>

                    {/* 電話 */}
                    <F label="電話（選填）">
                        <input
                            value={form.contactPhone ?? ""}
                            onChange={e => set("contactPhone", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="請輸入聯絡電話"
                        />
                    </F>

                    {/* 統編 */}
                    <F label="統一編號（選填）">
                        <input
                            value={form.taxId ?? ""}
                            onChange={e => set("taxId", e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="請輸入統一編號"
                        />
                    </F>

                    {/* 啟用狀態 */}
                    <F label="啟用狀態">
                        <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                checked={!!form.isActive}
                                onChange={e => set("isActive", e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className={form.isActive ? "text-emerald-700" : "text-gray-500"}>
                                {form.isActive ? "啟用" : "停用"}
                            </span>
                        </label>
                    </F>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <button className="px-4 py-2 border rounded" onClick={onClose}>取消</button>
                    <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
                        disabled={saving || !form.name.trim() || !form.typeId}
                        onClick={async () => {
                            setSaving(true);
                            try { await onSubmit(form); } finally { setSaving(false); }
                        }}
                    >
                        {saving ? "儲存中..." : "儲存"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <label className={`space-y-1${wide ? " col-span-2" : ""}`}>
            <div className="text-gray-500 font-medium text-xs">{label}</div>
            {children}
        </label>
    );
}
