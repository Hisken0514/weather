import React, {useEffect, useMemo, useState} from "react";
import api from "@/services/apiService";
import {Edit3, Globe, Plus, RefreshCw, Trash2} from "lucide-react";
import {getAccessToken} from "@/services/serverAuthService";

async function authHeaders() {
    const token = await getAccessToken();
    return {
        headers: {
            Authorization: token ? `Bearer ${token.value}` : "",
        },
    };
}

type OrgDomain = {
    id: number;
    organizationId: number;
    organizationName: string;
    domainName: string;
    description?: string | null;
    isPrimary: boolean;
    isSharedWithChildren: boolean;
    priority: number;
    isActive: boolean;
    verifiedAt?: string | null;
    createdAt: string;
};

type OrgDomainUpsert = {
    organizationId: number;
    domainName: string;
    description?: string | null;
    isPrimary: boolean;
    isSharedWithChildren: boolean;
    priority: number;
    isActive: boolean;
};

type OrgTreeNode = {
    id: number;
    name: string;
    typeCode: string;
    children?: OrgTreeNode[];
};

export default function OrganizationDomainView() {
    const [domains, setDomains] = useState<OrgDomain[]>([]);
    const [orgs, setOrgs] = useState<OrgTreeNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterOrgId, setFilterOrgId] = useState<number | "">("");

    // 新增 / 編輯表單
    const emptyDraft: OrgDomainUpsert = {
        organizationId: 0,
        domainName: "",
        description: "",
        isPrimary: false,
        isSharedWithChildren: false,
        priority: 0,
        isActive: true,
    };
    const [draft, setDraft] = useState<OrgDomainUpsert>(emptyDraft);
    const [editingId, setEditingId] = useState<number | null>(null);

    // 攤平組織樹
    const flatOrgs = useMemo(() => {
        const result: { id: number; name: string; depth: number }[] = [];
        const walk = (nodes: OrgTreeNode[], depth: number) => {
            for (const n of nodes) {
                result.push({id: n.id, name: n.name, depth});
                if (n.children) walk(n.children, depth + 1);
            }
        };
        walk(orgs, 0);
        return result;
    }, [orgs]);

    const load = async () => {
        setLoading(true);
        try {
            const params = filterOrgId !== "" ? {params: {orgId: filterOrgId}} : {};
            const [dRes, oRes] = await Promise.all([
                api.get<OrgDomain[]>("/Admin/org/domains", {
                    ...(await authHeaders()),
                    ...params,
                }),
                api.get<OrgTreeNode[]>("/Admin/org/tree", await authHeaders()),
            ]);
            setDomains(dRes.data);
            setOrgs(oRes.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [filterOrgId]);

    const save = async () => {
        if (!draft.organizationId) return alert("請選擇組織");
        if (!draft.domainName.trim()) return alert("請輸入網域名稱");

        if (editingId) {
            await api.put(`/Admin/org/domains/${editingId}`, draft, await authHeaders());
        } else {
            await api.post("/Admin/org/domains", draft, await authHeaders());
        }
        setDraft(emptyDraft);
        setEditingId(null);
        await load();
    };

    const startEdit = (d: OrgDomain) => {
        setEditingId(d.id);
        setDraft({
            organizationId: d.organizationId,
            domainName: d.domainName,
            description: d.description ?? "",
            isPrimary: d.isPrimary,
            isSharedWithChildren: d.isSharedWithChildren,
            priority: d.priority,
            isActive: d.isActive,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft(emptyDraft);
    };

    const deleteDomain = async (d: OrgDomain) => {
        if (!confirm(`確定要刪除網域「${d.domainName}」？`)) return;
        await api.delete(`/Admin/org/domains/${d.id}`, await authHeaders());
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Globe className="w-5 h-5"/> 網域管理
                </h3>
                <button onClick={load} className="px-3 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4"/> 重新整理
                </button>
            </div>

            {/* 篩選 */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-600">依組織篩選：</label>
                    <select
                        value={filterOrgId}
                        onChange={e => setFilterOrgId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="px-3 py-2 border rounded-lg text-sm min-w-[200px]"
                    >
                        <option value="">全部組織</option>
                        {flatOrgs.map(o => (
                            <option key={o.id} value={o.id}>
                                {"　".repeat(o.depth)}{o.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 新增 / 編輯表單 */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold mb-3">
                    {editingId ? "編輯網域" : "新增網域"}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <L label="所屬組織">
                        <select
                            value={draft.organizationId || ""}
                            onChange={e => setDraft({...draft, organizationId: Number(e.target.value) || 0})}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">— 請選擇 —</option>
                            {flatOrgs.map(o => (
                                <option key={o.id} value={o.id}>
                                    {"　".repeat(o.depth)}{o.name}
                                </option>
                            ))}
                        </select>
                    </L>
                    <L label="網域名稱">
                        <input
                            value={draft.domainName}
                            onChange={e => setDraft({...draft, domainName: e.target.value})}
                            placeholder="例如：example.com"
                            className="w-full px-3 py-2 border rounded"
                        />
                    </L>
                    <L label="說明">
                        <input
                            value={draft.description ?? ""}
                            onChange={e => setDraft({...draft, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </L>
                    <L label="優先級">
                        <input
                            type="number"
                            value={draft.priority}
                            onChange={e => setDraft({...draft, priority: Number(e.target.value) || 0})}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </L>
                </div>
                <div className="flex items-center gap-6 mt-3 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={draft.isPrimary}
                            onChange={e => setDraft({...draft, isPrimary: e.target.checked})}
                        />
                        主要網域
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={draft.isSharedWithChildren}
                            onChange={e => setDraft({...draft, isSharedWithChildren: e.target.checked})}
                        />
                        共享給子組織
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={e => setDraft({...draft, isActive: e.target.checked})}
                        />
                        啟用
                    </label>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                    {editingId && (
                        <button onClick={cancelEdit} className="px-3 py-2 border rounded text-gray-600 hover:bg-gray-50">
                            取消
                        </button>
                    )}
                    <button onClick={save} className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2 hover:bg-indigo-700">
                        <Plus className="w-4 h-4"/> {editingId ? "更新" : "新增"}
                    </button>
                </div>
            </div>

            {/* 列表 */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold mb-3">網域列表（共 {domains.length} 筆）</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">組織</th>
                            <th className="px-3 py-2 text-left">網域</th>
                            <th className="px-3 py-2 text-left">說明</th>
                            <th className="px-3 py-2 text-center">主要</th>
                            <th className="px-3 py-2 text-center">共享</th>
                            <th className="px-3 py-2 text-center">優先級</th>
                            <th className="px-3 py-2 text-center">啟用</th>
                            <th className="px-3 py-2 text-left">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {domains.map(d => (
                            <tr key={d.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">{d.id}</td>
                                <td className="px-3 py-2">{d.organizationName}</td>
                                <td className="px-3 py-2 font-mono">{d.domainName}</td>
                                <td className="px-3 py-2 text-gray-500">{d.description || "-"}</td>
                                <td className="px-3 py-2 text-center">{d.isPrimary ? "V" : ""}</td>
                                <td className="px-3 py-2 text-center">{d.isSharedWithChildren ? "V" : ""}</td>
                                <td className="px-3 py-2 text-center">{d.priority}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {d.isActive ? "啟用" : "停用"}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                        <button className="text-blue-600 hover:text-blue-800" onClick={() => startEdit(d)} title="編輯">
                                            <Edit3 size={16}/>
                                        </button>
                                        <button className="text-red-600 hover:text-red-800" onClick={() => deleteDomain(d)} title="刪除">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {domains.length === 0 && !loading && (
                            <tr>
                                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                                    尚無網域資料
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function L({label, children}: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1"><div className="text-gray-500">{label}</div>{children}</label>;
}
