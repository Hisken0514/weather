import React from "react";
import api from "@/services/apiService";
import {Edit3, Plus, Trash2} from "lucide-react";
import {getAccessToken} from "@/services/serverAuthService";

async function authHeaders() {
    const token = await getAccessToken();
    return {
        headers: {
            Authorization: token ? `Bearer ${token.value}` : "",
        },
    };
}

export default function PermissionManagementView() {
    type PermRowDto = {
        key: string;
        label: string;
        grants: Record<string, boolean>; // roleName -> allow
    };
    type PermissionMatrixDto = {
        roles: string[];
        rows: PermRowDto[];
    };

    const [roles, setRoles] = React.useState<string[]>([]);
    const [rows, setRows] = React.useState<PermRowDto[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [dirty, setDirty] = React.useState(false);

    const [newLabel, setNewLabel] = React.useState("");
    const [newKey, setNewKey] = React.useState("");
    const [newRole, setNewRole] = React.useState("");

    const slugify = (s: string) =>
        s
            .trim()
            .replace(/[\s\/]+/g, ".")
            .replace(/[^a-zA-Z0-9_.-]/g, "")
            .replace(/\.+/g, ".")
            .toLowerCase();

    // ---- API ----
    const loadMatrix = React.useCallback(async () => {
        try {
            setLoading(true);

            const { data } = await api.get<PermissionMatrixDto>("/Admin/matrix", await authHeaders());
            setRoles(data.roles);
            setRows(data.rows);
            setDirty(false); // 後端回刷後視為乾淨
        } catch (e: any) {
            console.error(e);
            alert(`載入權限矩陣失敗：${e?.message || e}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const upsertPermission = React.useCallback(async (key: string, label?: string) => {
        await api.post("/Admin", { key, label }, { ...(await authHeaders()) });
    }, []);

    const deletePermission = React.useCallback(async (key: string) => {
        await api.delete(`/Admin/${encodeURIComponent(key)}`, { ...(await authHeaders()) });
    }, []);

    const saveMatrix = React.useCallback(async (payload: { rows: PermRowDto[] }) => {
        await api.post("/Admin/matrix", payload, { ...(await authHeaders()) });
    }, []);

    const createRole = React.useCallback(async (name: string) => {
        await api.post("/Admin/roles", { name }, { ...(await authHeaders()) });
    }, []);

    const deleteRoleApi = React.useCallback(async (name: string) => {
        await api.delete(`/Admin/roles/${encodeURIComponent(name)}`, { ...(await authHeaders()) });
    }, []);

    const renameRoleApi = React.useCallback(async (oldName: string, newName: string) => {
        await api.patch(`/Admin/roles/${encodeURIComponent(oldName)}`, { newName }, { ...(await authHeaders()) });
    }, []);

    // ---- lifecycle ----
    React.useEffect(() => {
        loadMatrix();
    }, [loadMatrix]);

    // 離開頁面前提醒有未儲存變更
    React.useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [dirty]);

    // ---- UI actions ----
    const onAdd = async () => {
        const label = newLabel.trim();
        const key = (newKey || slugify(newLabel)).trim().toLowerCase(); // 正規化 key
        if (!label || !key) return alert("請輸入功能名稱與 Key");
        if (!/^[a-z0-9_.-]+$/.test(key)) return alert("Key 僅能使用小寫英數、點、減號、底線");
        if (rows.some((r) => r.key === key)) return alert("Key 已存在");

        try {
            await upsertPermission(key, label.trim());
            setNewLabel("");
            setNewKey("");
            await loadMatrix();
        } catch (e: any) {
            console.error(e);
            alert(`新增失敗：${e?.message || e}`);
        }
    };

    const onToggle = (key: string, role: string) => {
        setDirty(true);
        setRows((prev) =>
            prev.map((r) =>
                r.key === key ? { ...r, grants: { ...r.grants, [role]: !(!!r.grants[role]) } } : r
            )
        );
    };

    const onDelete = async (key: string) => {
        if (!confirm("確定刪除此功能？")) return;
        try {
            await deletePermission(key);
            setRows((prev) => prev.filter((r) => r.key !== key)); // 樂觀更新
            setDirty(true);
        } catch (e: any) {
            console.error(e);
            alert(`刪除失敗：${e?.message || e}`);
            await loadMatrix(); // 失敗時回刷
        }
    };

    const onSave = async () => {
        try {
            setSaving(true);
            // 儲存前統一正規化 key / label
            await saveMatrix({
                rows: rows.map((r) => ({
                    key: r.key.trim().toLowerCase(),
                    label: r.label.trim(),
                    grants: r.grants,
                })),
            });
            await loadMatrix();
            alert("已儲存");
        } catch (e: any) {
            console.error(e);
            alert(`儲存失敗：${e?.message || e}`);
        } finally {
            setSaving(false);
        }
    };

    const onCreateRole = async () => {
        const name = newRole.trim();
        if (!name) return alert("請輸入角色名稱");
        // 避免重複（大小寫不敏感）
        if (roles.some((r) => r.toLowerCase() === name.toLowerCase())) {
            return alert("角色已存在");
        }
        try {
            await createRole(name);
            setNewRole("");
            await loadMatrix(); // 後端新增後重新載入，矩陣會多出該角色欄
        } catch (e: any) {
            console.error(e);
            alert(`新增角色失敗：${e?.message || e}`);
        }
    };

    // 可選：保護不能刪除的角色（依需求調整）
    const protectedRoles = React.useMemo(() => new Set(["admin"]), []);

    const onDeleteRole = async (name: string) => {
        if (protectedRoles.has(name)) return alert(`「${name}」為受保護角色，無法刪除`);
        if (!confirm(`確定刪除角色「${name}」？此動作會移除該角色的所有授權。`)) return;
        try {
            await deleteRoleApi(name);
            await loadMatrix(); // 重新載入：表頭會移除該角色欄
        } catch (e: any) {
            console.error(e);
            alert(`刪除角色失敗：${e?.message || e}`);
        }
    };

    const onRenameRole = async (oldName: string) => {
        const newName = prompt(`將角色「${oldName}」更名為：`, oldName)?.trim();
        if (!newName || newName === oldName) return;
        if (roles.some((r) => r.toLowerCase() === newName.toLowerCase()))
            return alert("新角色名稱已存在");
        try {
            await renameRoleApi(oldName, newName);
            await loadMatrix();
        } catch (e: any) {
            console.error(e);
            alert(`更名角色失敗：${e?.message || e}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-800">權限管理</h2>
                    {dirty && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
              有未儲存變更
            </span>
                    )}
                </div>
                <button
                    onClick={onSave}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    disabled={saving || loading || !dirty}
                    title={!dirty ? "沒有變更需要儲存" : "儲存變更"}
                >
                    {saving ? "儲存中…" : "儲存"}
                </button>
            </div>

            {/* 新增角色 */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">新增角色</label>
                        <input
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            placeholder="例如：auditor"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={onCreateRole}
                            className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            disabled={loading}
                        >
                            新增角色
                        </button>
                    </div>
                </div>

                {/* 角色清單（更名／刪除） */}
                <div>
                    <div className="text-xs text-gray-500 mb-2">現有角色</div>
                    <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                            <div
                                key={r}
                                className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-gray-200 bg-gray-50"
                                title={r}
                            >
                                <span className="text-sm text-gray-700">{r}</span>

                                {/* 更名 */}
                                <button
                                    onClick={() => onRenameRole(r)}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300"
                                    title="更名"
                                >
                                    <Edit3 size={14} /> 更名
                                </button>

                                {/* 刪除 */}
                                <button
                                    onClick={() => onDeleteRole(r)}
                                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                        protectedRoles.has(r)
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : "bg-red-100 text-red-600 hover:bg-red-200"
                                    }`}
                                    title={protectedRoles.has(r) ? "受保護角色，無法刪除" : "刪除"}
                                    disabled={protectedRoles.has(r)}
                                >
                                    <Trash2 size={14} /> 刪除
                                </button>
                            </div>
                        ))}
                        {roles.length === 0 && (
                            <span className="text-sm text-gray-500">尚無角色，請先新增。</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 新增功能列 */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">功能名稱（Label）</label>
                    <input
                        value={newLabel}
                        onChange={(e) => {
                            setNewLabel(e.target.value);
                            if (!newKey) setNewKey(slugify(e.target.value));
                        }}
                        placeholder="例如：改善報告審核"
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                        功能 Key（預設依名稱自動產生，可自行調整）
                    </label>
                    <input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="例如：report.audit"
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={onAdd}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                        disabled={loading}
                    >
                        <Plus size={18} /> 新增功能
                    </button>
                </div>
            </div>

            {/* 權限矩陣表 */}
            <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">功能 Key</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">功能名稱</th>
                        {roles.map((r) => (
                            <th key={r} className="px-4 py-3 text-center text-sm font-medium text-gray-700" title={r}>
                                {r}
                            </th>
                        ))}
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {rows.map((p) => (
                        <tr key={p.key} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-800">{p.key}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">
                                {/* inline 編輯 label；保存時一併送後端 */}
                                <input
                                    value={p.label}
                                    onChange={(e) => {
                                        setDirty(true);
                                        const v = e.target.value;
                                        setRows((prev) =>
                                            prev.map((r) => (r.key === p.key ? { ...r, label: v } : r))
                                        );
                                    }}
                                    className="px-2 py-1 border rounded w-full"
                                />
                            </td>
                            {roles.map((r) => (
                                <td key={r} className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!p.grants[r]}
                                        onChange={() => onToggle(p.key, r)}
                                    />
                                </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                                <button
                                    onClick={() => onDelete(p.key)}
                                    className="text-red-500 hover:text-red-600"
                                    title="刪除此功能"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && !loading && (
                        <tr>
                            <td
                                colSpan={2 + roles.length + 1}
                                className="px-4 py-8 text-center text-sm text-gray-500"
                            >
                                目前尚無權限項目，請使用上方「新增功能」建立。
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>

                <p className="text-xs text-gray-500 mt-3">
                    角色與權限鍵值由後端提供；若列表為空請先建立角色或執行 Seeder。
                </p>
            </div>
        </div>
    );
}