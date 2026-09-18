import React, {useEffect, useMemo, useState} from "react";
import api from "@/services/apiService";
import {Edit3, Plus, RefreshCw, Trash2} from "lucide-react";
import {getAccessToken} from "@/services/serverAuthService";

async function authHeaders() {
    const token = await getAccessToken();
    return {
        headers: {
            Authorization: token ? `Bearer ${token.value}` : "",
        },
    };
}

type OrgType = {
    id: number;
    typeCode: string;
    typeName: string;
    description?: string | null;
    canHaveChildren: boolean;
};

type HierRule = {
    id: number;
    parentTypeId: number;
    childTypeId: number;
    isRequired: boolean;
    maxChildren?: number | null;
};

export default function OrganizationTypesRulesView() {
    const [types, setTypes] = useState<OrgType[]>([]);
    const [rules, setRules] = useState<HierRule[]>([]);
    const [loading, setLoading] = useState(false);

    // 表單狀態
    const [typeDraft, setTypeDraft] = useState<Partial<OrgType>>({});
    const [ruleDraft, setRuleDraft] = useState<Partial<HierRule>>({});

    const load = async () => {
        setLoading(true);
        try {
            const [t, r] = await Promise.all([
                api.get<OrgType[]>("/Admin/org/types", await authHeaders()),
                api.get<HierRule[]>("/Admin/org/hierarchy", await authHeaders()),
            ]);
            setTypes(t.data);
            setRules(r.data);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const typeMap = useMemo(() => new Map(types.map(t => [t.id, t])), [types]);

    // 類型 CRUD
    const createType = async () => {
        if (!typeDraft.typeCode || !typeDraft.typeName) return alert("請輸入 TypeCode 與 TypeName");
        await api.post("/Admin/org/types", {
            typeCode: typeDraft.typeCode,
            typeName: typeDraft.typeName,
            description: typeDraft.description ?? "",
            canHaveChildren: !!typeDraft.canHaveChildren,
        }, await authHeaders());
        setTypeDraft({});
        await load();
    };
    const updateType = async (t: OrgType) => {
        await api.put(`/Admin/org/types/${t.id}`, t,
            await authHeaders());
        await load();
    };
    const deleteType = async (t: OrgType) => {
        if (!confirm(`刪除類型「${t.typeName}」？`)) return;
        await api.delete(`/Admin/org/types/${t.id}`,
            await authHeaders());
        await load();
    };

    // 規則 CRUD
    const createRule = async () => {
        if (!ruleDraft.parentTypeId || !ruleDraft.childTypeId) return alert("請選擇父/子類型");
        await api.post("/Admin/org/hierarchy", {
            parentTypeId: ruleDraft.parentTypeId,
            childTypeId: ruleDraft.childTypeId,
            isRequired: !!ruleDraft.isRequired,
            maxChildren: ruleDraft.maxChildren ?? null,
        }, await authHeaders());
        setRuleDraft({});
        await load();
    };
    const updateRule = async (r: HierRule) => {
        await api.put(`/Admin/org/hierarchy/${r.id}`, r,
            await authHeaders());
        await load();
    };
    const deleteRule = async (r: HierRule) => {
        if (!confirm("刪除此階層規則？")) return;
        await api.delete(`/Admin/org/hierarchy/${r.id}`,
            await authHeaders());
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">類型與階層規則</h3>
                <button onClick={load} className="px-3 py-2 border rounded-lg flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> 重新整理
                </button>
            </div>

            {/* 類型管理 */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold mb-3">類型（OrganizationType）</div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                    <L label="TypeCode"><I v={typeDraft.typeCode ?? ""} onC={v=>setTypeDraft({...typeDraft, typeCode:v})}/></L>
                    <L label="TypeName"><I v={typeDraft.typeName ?? ""} onC={v=>setTypeDraft({...typeDraft, typeName:v})}/></L>
                    <L label="描述"><I v={typeDraft.description ?? ""} onC={v=>setTypeDraft({...typeDraft, description:v})}/></L>
                    <L label="可有子層">
                        <input type="checkbox" checked={!!typeDraft.canHaveChildren} onChange={e=>setTypeDraft({...typeDraft, canHaveChildren:e.target.checked})}/>
                    </L>
                </div>
                <div className="flex justify-end mt-3">
                    <button onClick={createType} className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2">
                        <Plus className="w-4 h-4" /> 新增類型
                    </button>
                </div>

                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">TypeCode</th>
                            <th className="px-3 py-2 text-left">TypeName</th>
                            <th className="px-3 py-2 text-left">可有子層</th>
                            <th className="px-3 py-2 text-left">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {types.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">{t.id}</td>
                                <td className="px-3 py-2">{t.typeCode}</td>
                                <td className="px-3 py-2">{t.typeName}</td>
                                <td className="px-3 py-2">{t.canHaveChildren ? "是" : "否"}</td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                        <button className="text-blue-600" onClick={() => updateType({ ...t, canHaveChildren: !t.canHaveChildren })}>
                                            <Edit3 size={16}/> 切換可有子層
                                        </button>
                                        <button className="text-red-600" onClick={() => deleteType(t)}>
                                            <Trash2 size={16}/> 刪除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {types.length === 0 && !loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">尚無類型</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 階層規則 */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold mb-3">階層規則（ParentType → ChildType）</div>

                <div className="grid grid-cols-5 gap-3 text-sm">
                    <L label="ParentType">
                        <select value={ruleDraft.parentTypeId ?? ""} onChange={e=>setRuleDraft({...ruleDraft, parentTypeId: Number(e.target.value) || undefined})} className="w-full px-3 py-2 border rounded">
                            <option value="">—</option>
                            {types.map(t => <option value={t.id} key={t.id}>{t.typeName} ({t.typeCode})</option>)}
                        </select>
                    </L>
                    <L label="ChildType">
                        <select value={ruleDraft.childTypeId ?? ""} onChange={e=>setRuleDraft({...ruleDraft, childTypeId: Number(e.target.value) || undefined})} className="w-full px-3 py-2 border rounded">
                            <option value="">—</option>
                            {types.map(t => <option value={t.id} key={t.id}>{t.typeName} ({t.typeCode})</option>)}
                        </select>
                    </L>
                    <L label="MaxChildren">
                        <input type="number" value={ruleDraft.maxChildren ?? ""} onChange={e=>setRuleDraft({...ruleDraft, maxChildren: e.target.value===""? undefined:Number(e.target.value)})} className="w-full px-3 py-2 border rounded"/>
                    </L>
                    <L label="IsRequired">
                        <input type="checkbox" checked={!!ruleDraft.isRequired} onChange={e=>setRuleDraft({...ruleDraft, isRequired:e.target.checked})}/>
                    </L>
                    <div className="flex items-end">
                        <button onClick={createRule} className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2">
                            <Plus className="w-4 h-4" /> 新增規則
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">ID</th>
                            <th className="px-3 py-2 text-left">Parent</th>
                            <th className="px-3 py-2 text-left">Child</th>
                            <th className="px-3 py-2 text-left">MaxChildren</th>
                            <th className="px-3 py-2 text-left">IsRequired</th>
                            <th className="px-3 py-2 text-left">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {rules.map(r => {
                            const p = typeMap.get(r.parentTypeId);
                            const c = typeMap.get(r.childTypeId);
                            return (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">{r.id}</td>
                                    <td className="px-3 py-2">{p ? `${p.typeName} (${p.typeCode})` : r.parentTypeId}</td>
                                    <td className="px-3 py-2">{c ? `${c.typeName} (${c.typeCode})` : r.childTypeId}</td>
                                    <td className="px-3 py-2">{r.maxChildren ?? "-"}</td>
                                    <td className="px-3 py-2">{r.isRequired ? "是" : "否"}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2">
                                            <button className="text-blue-600" onClick={() => updateRule({ ...r, isRequired: !r.isRequired })}>
                                                <Edit3 size={16}/> 切換必要
                                            </button>
                                            <button className="text-red-600" onClick={() => deleteRule(r)}>
                                                <Trash2 size={16}/> 刪除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rules.length === 0 && !loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">尚無規則</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function L({label,children}:{label:string;children:React.ReactNode}) {
    return <label className="space-y-1"><div className="text-gray-500">{label}</div>{children}</label>
}
function I({v,onC}:{v:string;onC:(v:string)=>void}) {
    return <input value={v} onChange={e=>onC(e.target.value)} className="w-full px-3 py-2 border rounded"/>
}