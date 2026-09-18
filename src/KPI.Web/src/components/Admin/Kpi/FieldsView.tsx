'use client';
import React from 'react';
import api from '@/services/apiService';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/services/serverAuthService';

type KpiFieldDto = { id: number; field: string; enField: string; };

export default function FieldsView() {
    const [rows, setRows] = React.useState<KpiFieldDto[]>([]);
    const [form, setForm] = React.useState({ field: '', enField: '' });
    const [editingId, setEditingId] = React.useState<number|null>(null);

    const authHeaders = React.useCallback(async () => {
        const t = await getAccessToken();
        return { headers: { Authorization: t ? `Bearer ${t.value}` : '' } };
    }, []);

    const load = React.useCallback(async () => {
        const { data } = await api.get<KpiFieldDto[]>('/Admin/kpi/fields', await authHeaders());
        setRows(data);
    }, [authHeaders]);

    React.useEffect(() => { load(); }, [load]);

    const submit = async () => {
        try {
            if (editingId) {
                await api.put(`/Admin/kpi/fields/${editingId}`, form, await authHeaders());
                toast.success('已更新領域');
            } else {
                await api.post(`/Admin/kpi/fields`, form, await authHeaders());
                toast.success('已新增領域');
            }
            setForm({ field: '', enField: '' });
            setEditingId(null);
            load();
        } catch (e:any) { toast.error(e.message || '儲存失敗'); }
    };

    const remove = async (id:number) => {
        if (!confirm('確定刪除？')) return;
        try { await api.delete(`/Admin/kpi/fields/${id}`, await authHeaders()); toast.success('已刪除'); load(); }
        catch (e:any) { toast.error(e.message || '刪除失敗'); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border">
                <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded px-3 py-2" placeholder="中文名稱"
                           value={form.field} onChange={e=>setForm(f=>({...f, field:e.target.value}))}/>
                    <input className="border rounded px-3 py-2" placeholder="英文名稱"
                           value={form.enField} onChange={e=>setForm(f=>({...f, enField:e.target.value}))}/>
                </div>
                <div className="mt-3">
                    <button onClick={submit} className="px-4 py-2 rounded border">儲存</button>
                    {editingId && <button onClick={()=>{setEditingId(null);setForm({field:'',enField:''});}} className="ml-2 px-3 py-2 border rounded">取消</button>}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border">
                <table className="w-full">
                    <thead><tr><th>ID</th><th>中文</th><th>英文</th><th>操作</th></tr></thead>
                    <tbody>
                    {rows.map(r=>(
                        <tr key={r.id} className="border-t">
                            <td className="py-2">{r.id}</td>
                            <td>{r.field}</td>
                            <td>{r.enField}</td>
                            <td className="space-x-2">
                                <button className="text-blue-600" onClick={()=>{setEditingId(r.id); setForm({field:r.field,enField:r.enField});}}>編輯</button>
                                <button className="text-red-600" onClick={()=>remove(r.id)}>刪除</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length===0 && <tr><td colSpan={4} className="py-6 text-center text-gray-500">尚無資料</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}