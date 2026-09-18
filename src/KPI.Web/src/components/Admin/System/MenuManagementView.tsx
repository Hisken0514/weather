"use client";
import React, { useCallback, useEffect, useState } from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { toast } from "react-hot-toast";
import { useMenuStore } from "@/Stores/menuStore";

type MenuRow = {
    id: number;
    label: string;
    link: string;
    icon: string | null;
    parentId: number | null;
    sortOrder: number;
    isActive: number;
    menuType: string;
};

type FormState = Omit<MenuRow, "id">;

const EMPTY: FormState = {
    label: "",
    link: "",
    icon: "",
    parentId: null,
    sortOrder: 0,
    isActive: 0,
    menuType: "",
};

export default function MenuManagementView() {
    const [rows, setRows] = useState<MenuRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [saving, setSaving] = useState(false);

    const authHeader = useCallback(async () => {
        const t = await getAccessToken();
        return { headers: { Authorization: t ? `Bearer ${t.value}` : "" } };
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<MenuRow[]>("/Menu/admin/all", await authHeader());
            setRows(data);
        } catch {
            toast.error("載入失敗");
        } finally {
            setLoading(false);
        }
    }, [authHeader]);

    useEffect(() => {
        load();
    }, [load]);

    // 操作後同步更新全站 Header 導覽列
    const refreshMenuStore = async () => {
        try {
            const t = await getAccessToken();
            const res = await api.get("/Menu/GetMenus", {
                headers: { Authorization: t ? `Bearer ${t.value}` : "" },
            });
            useMenuStore.getState().setMenu(res.data);
        } catch {
            // non-critical，不影響管理操作
        }
    };

    const openAdd = () => {
        setEditingId(null);
        setForm(EMPTY);
        setShowModal(true);
    };

    const openEdit = (r: MenuRow) => {
        setEditingId(r.id);
        setForm({
            label: r.label,
            link: r.link,
            icon: r.icon ?? "",
            parentId: r.parentId,
            sortOrder: r.sortOrder,
            isActive: r.isActive,
            menuType: r.menuType,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.label.trim()) { toast.error("標籤名稱為必填"); return; }
        const isParent = form.parentId === null;
        if (!isParent && !form.link.trim()) { toast.error("連結為必填"); return; }
        setSaving(true);
        try {
            const body = { ...form, icon: form.icon?.trim() || null };
            if (editingId === null) {
                await api.post("/Menu", body, await authHeader());
                toast.success("新增成功");
            } else {
                await api.put(`/Menu/${editingId}`, body, await authHeader());
                toast.success("更新成功");
            }
            setShowModal(false);
            await load();
            await refreshMenuStore();
        } catch {
            toast.error("儲存失敗");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, label: string) => {
        if (!confirm(`確定刪除「${label}」？若有子選單請先刪除子項目。`)) return;
        try {
            await api.delete(`/Menu/${id}`, await authHeader());
            toast.success("已刪除");
            await load();
            await refreshMenuStore();
        } catch {
            toast.error("刪除失敗");
        }
    };

    // 只取一級選單作為父選單選項（排除自己）
    const parentOptions = rows.filter(r => r.parentId === null && r.id !== editingId);

    return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">選單管理</h3>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                    ＋ 新增選單
                </button>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-10 text-center text-gray-400">載入中…</div>
                ) : rows.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">無資料</div>
                ) : (
                    <table className="table table-sm w-full">
                        <thead>
                            <tr>
                                <th>排序</th>
                                <th>標籤名稱</th>
                                <th>連結</th>
                                <th>父選單</th>
                                <th>類型</th>
                                <th>Icon</th>
                                <th>狀態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="hover">
                                    <td className="text-gray-500">{r.sortOrder}</td>
                                    <td className={r.parentId !== null ? "pl-6 text-gray-600" : "font-medium"}>
                                        {r.parentId !== null ? "└ " : ""}{r.label}
                                    </td>
                                    <td className="text-xs text-gray-500 max-w-[160px] truncate" title={r.link}>
                                        {r.link}
                                    </td>
                                    <td className="text-sm text-gray-500">
                                        {rows.find(p => p.id === r.parentId)?.label ?? "—"}
                                    </td>
                                    <td className="text-sm">{r.menuType || "—"}</td>
                                    <td className="text-xs text-gray-400">{r.icon || "—"}</td>
                                    <td>
                                        <span className={`badge badge-sm ${r.isActive === 0 ? "badge-success" : "badge-ghost"}`}>
                                            {r.isActive === 0 ? "啟用" : "停用"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button
                                                className="btn btn-xs btn-ghost"
                                                onClick={() => openEdit(r)}
                                            >
                                                編輯
                                            </button>
                                            <button
                                                className="btn btn-xs btn-error btn-outline"
                                                onClick={() => handleDelete(r.id, r.label)}
                                            >
                                                刪除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 新增/編輯 Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-3">
                        <h4 className="font-semibold text-lg">
                            {editingId !== null ? "編輯選單" : "新增選單"}
                        </h4>

                        <div>
                            <label className="label label-text text-xs pb-1">標籤名稱 *</label>
                            <input
                                className="input input-bordered w-full input-sm"
                                value={form.label}
                                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                placeholder="例：填報資料"
                            />
                        </div>

                        <div>
                            <label className="label label-text text-xs pb-1">連結 *</label>
                            <input
                                className="input input-bordered w-full input-sm"
                                value={form.link}
                                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                                placeholder="例：/reportEntry"
                            />
                        </div>

                        <div>
                            <label className="label label-text text-xs pb-1">
                                Icon（Heroicons 名稱，可留空）
                            </label>
                            <input
                                className="input input-bordered w-full input-sm"
                                value={form.icon ?? ""}
                                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                                placeholder="例：ChartBarIcon"
                            />
                        </div>

                        <div>
                            <label className="label label-text text-xs pb-1">父選單（留空 = 一級選單）</label>
                            <select
                                className="select select-bordered w-full select-sm"
                                value={form.parentId ?? ""}
                                onChange={e => setForm(f => ({
                                    ...f,
                                    parentId: e.target.value ? Number(e.target.value) : null,
                                }))}
                            >
                                <option value="">無（一級選單）</option>
                                {parentOptions.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="label label-text text-xs pb-1">排序</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full input-sm"
                                    value={form.sortOrder}
                                    onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="label label-text text-xs pb-1">類型</label>
                                <input
                                    className="input input-bordered w-full input-sm"
                                    value={form.menuType}
                                    onChange={e => setForm(f => ({ ...f, menuType: e.target.value }))}
                                    placeholder="例：main"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label label-text text-xs pb-1">狀態</label>
                            <select
                                className="select select-bordered w-full select-sm"
                                value={form.isActive}
                                onChange={e => setForm(f => ({ ...f, isActive: Number(e.target.value) }))}
                            >
                                <option value={0}>啟用</option>
                                <option value={1}>停用</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowModal(false)}
                                disabled={saving}
                            >
                                取消
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "儲存中…" : "儲存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
