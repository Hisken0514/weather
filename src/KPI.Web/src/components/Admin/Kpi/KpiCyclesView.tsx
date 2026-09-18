"use client";
import React from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { toast } from "react-hot-toast";

type KpiCycle = { id:number; name:string; startYear:number; endYear:number; };
type KpiCycleUpsert = { name:string; startYear:number; endYear:number; };

async function auth() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

/** 輸入值 > 1911 視為西元年，自動轉民國；否則視為民國年直接使用 */
function toRocYear(v: number): number {
    return v > 1911 ? v - 1911 : v;
}

const currentRocYear = new Date().getFullYear() - 1911;

export default function KpiCyclesView() {
    const [rows, setRows] = React.useState<KpiCycle[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [draft, setDraft] = React.useState<KpiCycleUpsert>({
        name: "", startYear: currentRocYear, endYear: currentRocYear
    });
    const [editingId, setEditingId] = React.useState<number|null>(null);

    const load = React.useCallback(async ()=>{
        setLoading(true);
        try{
            const { data } = await api.get<KpiCycle[]>("/Admin/kpi/cycles", await auth());
            setRows(data);
        }finally{ setLoading(false); }
    },[]);
    React.useEffect(()=>{ load(); },[load]);

    const resetDraft = ()=> {
        setEditingId(null);
        setDraft({ name:"", startYear:currentRocYear, endYear:currentRocYear });
    };

    const save = async ()=>{
        try{
            if (editingId === null) {
                await api.post("/Admin/kpi/cycles", draft, await auth());
                toast.success("已新增週期");
            } else {
                await api.put(`/Admin/kpi/cycles/${editingId}`, draft, await auth());
                toast.success("已更新週期");
            }
            resetDraft();
            await load();
        } catch(e:any){
            toast.error(e?.response?.data?.message ?? e.message ?? "儲存失敗");
        }
    };

    const remove = async (id:number)=>{
        if (!confirm("確定刪除這個週期？（若已被使用將無法刪除）")) return;
        try{
            await api.delete(`/Admin/kpi/cycles/${id}`, await auth());
            toast.success("已刪除");
            await load();
        } catch(e:any){
            toast.error(e?.response?.data?.message ?? e.message ?? "刪除失敗");
        }
    };

    return (
        <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">KPI 週期管理</h3>
                <button className="px-3 py-1.5 border rounded" onClick={load} disabled={loading}>重新整理</button>
            </div>

            {/* 編輯區 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                <L label="名稱">
                    <input className="border rounded px-3 py-2 w-full"
                           value={draft.name} onChange={e=>setDraft(d=>({...d, name:e.target.value}))}/>
                </L>
                <L label="開始年（民國）">
                    <input className="border rounded px-3 py-2 w-full" type="number"
                           placeholder="例：114 或 2025"
                           value={draft.startYear}
                           onChange={e=>setDraft(d=>({...d, startYear:Number(e.target.value)||currentRocYear}))}
                           onBlur={e=>{ const v = Number(e.target.value); if(v>1911) setDraft(d=>({...d, startYear: toRocYear(v)})); }}/>
                </L>
                <L label="結束年（民國）">
                    <input className="border rounded px-3 py-2 w-full" type="number"
                           placeholder="例：114 或 2025"
                           value={draft.endYear}
                           onChange={e=>setDraft(d=>({...d, endYear:Number(e.target.value)||draft.startYear}))}
                           onBlur={e=>{ const v = Number(e.target.value); if(v>1911) setDraft(d=>({...d, endYear: toRocYear(v)})); }}/>
                </L>
                <div className="flex items-end gap-2">
                    <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={save}>
                        {editingId===null ? "新增" : "儲存"}
                    </button>
                    {editingId!==null && (
                        <button className="px-3 py-2 rounded border" onClick={resetDraft}>取消編輯</button>
                    )}
                </div>
            </div>

            {/* 清單 */}
            <table className="w-full text-sm">
                <thead>
                <tr className="bg-gray-50">
                    <th className="p-2 text-left">名稱</th>
                    <th className="p-2 text-center">開始年（民國）</th>
                    <th className="p-2 text-center">結束年（民國）</th>
                    <th className="p-2 text-right">操作</th>
                </tr>
                </thead>
                <tbody>
                {rows.map(r=>(
                    <tr key={r.id} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 text-center">{r.startYear}</td>
                        <td className="p-2 text-center">{r.endYear}</td>
                        <td className="p-2 text-right">
                            <button className="text-indigo-600 mr-3"
                                    onClick={()=>{ setEditingId(r.id); setDraft({ name:r.name, startYear:r.startYear, endYear:r.endYear }); }}>
                                編輯
                            </button>
                            <button className="text-red-600" onClick={()=>remove(r.id)}>刪除</button>
                        </td>
                    </tr>
                ))}
                {rows.length===0 && (
                    <tr><td className="p-4 text-gray-500" colSpan={4}>尚無週期，請新增。</td></tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

function L({label, children}:{label:string; children:React.ReactNode}) {
    return <label className="text-sm">{label}<div className="mt-1">{children}</div></label>;
}