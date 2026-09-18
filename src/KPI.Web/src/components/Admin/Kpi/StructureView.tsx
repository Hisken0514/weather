"use client";
import React from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import ItemEditor from "./ItemEditor";

type ItemRow = { id:number; indicatorNumber:number; displayName:string; detailCount:number; };
type ItemDetail = { id:number; detailItems: { id:number; unit:string }[] };

async function auth() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

export default function StructureView() {
    const [items, setItems] = React.useState<ItemRow[]>([]);
    const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
    const [details, setDetails] = React.useState<Record<number, ItemDetail>>({});
    const [editingItemId, setEditingItemId] = React.useState<number | null>(null);

    const loadPage1 = React.useCallback(async ()=>{
        const { data } = await api.get(`/Admin/kpi/items`, { ...(await auth()), params: { page:1, pageSize:50 }});
        setItems(data.items);
    }, []);

    React.useEffect(()=>{ loadPage1(); }, [loadPage1]);

    const toggle = async (itemId:number) => {
        const next = new Set(expanded);
        if (next.has(itemId)) {
            next.delete(itemId);
        } else {
            next.add(itemId);
            if (!details[itemId]) {
                const { data } = await api.get(`/Admin/kpi/items/${itemId}`, await auth());
                setDetails(d => ({ ...d, [itemId]: data }));
            }
        }
        setExpanded(next);
    };

    return (
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5 bg-white border rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-3">指標結構</h3>
                <ul className="text-sm">
                    {items.map(it=>(
                        <li key={it.id} className="border rounded-lg mb-2">
                            <div className="flex items-center justify-between px-3 py-2">
                                <button className="text-left" onClick={()=>toggle(it.id)}>
                                    <div className="font-medium">#{it.indicatorNumber} {it.displayName}</div>
                                    <div className="text-gray-500">細項數：{it.detailCount}</div>
                                </button>
                                <button className="text-indigo-600" onClick={()=>setEditingItemId(it.id)}>編輯</button>
                            </div>
                            {expanded.has(it.id) && details[it.id] && (
                                <ul className="px-4 pb-3">
                                    {details[it.id].detailItems.map(d=>(
                                        <li key={d.id} className="py-1 text-gray-700">・Detail #{d.id}：{d.unit}</li>
                                    ))}
                                    {details[it.id].detailItems.length===0 && <li className="py-1 text-gray-500">尚無細項</li>}
                                </ul>
                            )}
                        </li>
                    ))}
                    {items.length===0 && <li className="text-gray-500">尚無資料</li>}
                </ul>
            </div>

            <div className="col-span-7">
                {editingItemId
                    ? <ItemEditor itemId={editingItemId} onClose={()=>setEditingItemId(null)} />
                    : <div className="bg-white border rounded-xl p-6 text-gray-500">點左側項目以展開或編輯</div>}
            </div>
        </div>
    );
}
