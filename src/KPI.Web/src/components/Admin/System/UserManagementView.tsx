import React from "react";
import {Building2, CheckCircle, Clock, Eye, Filter, Lock, LockOpen, Mail, MailX, RefreshCw, Search, Send, Trash2, UserPlus, X} from "lucide-react";
import api from "@/services/apiService";
import {getAccessToken} from "@/services/serverAuthService";
import { parseUtc } from "@/utils/timetool";

type UserDetailDto = {
    id: string;
    username: string;
    nickname?: string | null;
    email?: string | null;
    mobile?: string | null;
    unit?: string | null;
    position?: string | null;
    organizationName?: string | null;
    roles: string[];
    isActive: boolean;
    emailVerified: boolean;
    emailVerifiedAt?: string | null;
    createdAt: string;
    lastLoginAt?: string | null;
    passwordChangedAt?: string | null;
    forceChangePassword: boolean;
    isLocked: boolean;
    lockedUntil?: string | null;
    failedAttempts: number;
};

async function authHeaders() {
    const token = await getAccessToken();
    return {
        headers: {
            Authorization: token ? `Bearer ${token.value}` : "",
        },
    };
}

function useDebounce<T>(value: T, delay = 350) {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

type UserListItemDto = {
    id: string;
    name: string;
    account: string;
    email?: string | null;
    roles: string[];
    unit?: string | null;
    organizationName?: string | null;
    status: "active" | "pending" | "disabled";
    lastLoginAt?: string | null;
    emailVerified: boolean;
    isLocked: boolean;
    lockedUntil?: string | null;
    failedAttempts: number;
    formaRegistered: boolean;
};

type PagedResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export default function UserManagementView() {
    const [rows, setRows] = React.useState<UserListItemDto[]>([]);
    const [q, setQ] = React.useState("");
    const debouncedQ = useDebounce(q, 350);
    const [role, setRole] = React.useState("");
    const [status, setStatus] = React.useState<"" | "active" | "pending" | "disabled" | "locked">("");
    const [orgFilter, setOrgFilter] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const [page, setPage] = React.useState(1);
    const [pageSize] = React.useState(20);
    const [total, setTotal] = React.useState(0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // 防競態
    const reqSeqRef = React.useRef(0);
    const lastAppliedRef = React.useRef(0);

    // 記錄過濾條件，變更時把 page 校正為 1
    const lastFilterRef = React.useRef({
        q: "",
        role: "",
        status: "" as "" | "active" | "pending" | "disabled" | "locked",
        orgFilter: "",
    });

    const roleClass = React.useCallback((r: string) =>
        r.includes("系統") ? "bg-red-100 text-red-700" :
            r.includes("政府") ? "bg-blue-100 text-blue-700" :
                r.includes("公司") ? "bg-green-100 text-green-700" :
                    "bg-purple-100 text-purple-700", []);

    const statusChip = React.useCallback((s: UserListItemDto["status"]) => {
        return s === "active" ? (
            <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} /> 啟用中</span>
        ) : s === "pending" ? (
            <span className="flex items-center gap-1 text-orange-600"><Clock size={16} /> 待審核</span>
        ) : (
            <span className="flex items-center gap-1 text-gray-500"><Clock size={16} /> 已停用</span>
        );
    }, []);

    const fmtTime = React.useCallback((iso?: string | null) => {
        if (!iso) return "-";
        const d = parseUtc(iso);
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }, []);

    // 單一來源的查詢
    const fetchUsers = React.useCallback(
        async (p: number, kw: string, r: string, s: "" | "active" | "pending" | "disabled" | "locked", org: string) => {
            const nextSeq = ++reqSeqRef.current;
            setLoading(true);
            try {
                const params: Record<string, any> = {
                    page: Math.max(1, p),   // 後端 1-based
                    pageSize,
                };
                if (kw && kw.trim()) params.q = kw.trim();
                if (r && r.trim()) params.role = r.trim();
                if (s) params.status = s;
                if (org) params.organizationId = parseInt(org, 10);

                const { data } = await api.get<PagedResult<UserListItemDto>>("/Admin/users", { params, ...(await authHeaders()) });
                if (nextSeq > lastAppliedRef.current) {
                    lastAppliedRef.current = nextSeq;
                    setRows(data.items ?? []);
                    setTotal(data.total ?? 0);
                }
            } catch (e: any) {
                console.error(e);
                if (nextSeq > lastAppliedRef.current) alert(`載入使用者失敗：${e?.message || e}`);
            } finally {
                if (nextSeq === reqSeqRef.current) setLoading(false);
            }
        },
        [pageSize]
    );

    // 依 page / 過濾條件打 API
    React.useEffect(() => {
        const prev = lastFilterRef.current;
        if (prev.q !== debouncedQ || prev.role !== role || prev.status !== status || prev.orgFilter !== orgFilter) {
            lastFilterRef.current = { q: debouncedQ, role, status, orgFilter };
            if (page !== 1) { setPage(1); return; }
        }
        fetchUsers(page, debouncedQ, role, status, orgFilter);
    }, [debouncedQ, role, status, orgFilter, page, fetchUsers]);

    // 操作
    const onToggleActive = React.useCallback(async (u: UserListItemDto) => {
        const isActive = u.status === "disabled";
        try {
            await api.patch(`/Admin/users/${u.id}/active`, { isActive }, { ...(await authHeaders())});
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`變更啟用狀態失敗：${e?.message || e}`);
        }
    }, [page, debouncedQ, role, status, fetchUsers]);

    const onToggleEmailVerified = React.useCallback(async (u: UserListItemDto) => {
        const newVal = !u.emailVerified;
        if (!confirm(`確定要將「${u.name}」的 Email 驗證狀態設為「${newVal ? "已驗證" : "未驗證"}」？`)) return;
        try {
            await api.patch(`/Admin/users/${u.id}/email-verified`, { emailVerified: newVal }, { ...(await authHeaders())});
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`變更 Email 驗證狀態失敗：${e?.message || e}`);
        }
    }, [page, debouncedQ, role, status, fetchUsers]);

    const onUnlock = React.useCallback(async (u: UserListItemDto) => {
        if (!confirm(`確定要解除「${u.name}」的帳號鎖定並重設錯誤次數？`)) return;
        try {
            await api.post(`/Admin/users/${u.id}/unlock`, {}, { ...(await authHeaders()) });
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`解除鎖定失敗：${e?.message || e}`);
        }
    }, [page, debouncedQ, role, status, fetchUsers]);

    // ===== 多選角色 Modal =====
    const [roleEditTarget, setRoleEditTarget] = React.useState<UserListItemDto | null>(null);
    const [roleEditSelected, setRoleEditSelected] = React.useState<string[]>([]);
    const [roleEditSaving, setRoleEditSaving] = React.useState(false);

    const onOpenRoleEdit = React.useCallback((u: UserListItemDto) => {
        setRoleEditTarget(u);
        setRoleEditSelected([...u.roles]);
    }, []);

    const onConfirmRoleEdit = React.useCallback(async () => {
        if (!roleEditTarget) return;
        setRoleEditSaving(true);
        try {
            await api.put(`/Admin/users/${roleEditTarget.id}/roles`, { roles: roleEditSelected }, { ...(await authHeaders()) });
            setRoleEditTarget(null);
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`設定角色失敗：${e?.message || e}`);
        } finally {
            setRoleEditSaving(false);
        }
    }, [roleEditTarget, roleEditSelected, page, debouncedQ, role, status, fetchUsers]);

    const [rolesList, setRolesList] = React.useState<string[]>([]);

    React.useEffect(() => {
        const fetchRoles = async () => {
            try {
                const { data } = await api.get<string[]>("/Admin/roles", await authHeaders());
                setRolesList(data);
            } catch (e: any) {
                console.error(e);
                alert("載入角色清單失敗：" + (e?.message || e));
            }
        };
        fetchRoles();
    }, []);

    const [sendingEmailId, setSendingEmailId] = React.useState<string | null>(null);
    const [provisioningId, setProvisioningId] = React.useState<string | null>(null);
    const [syncing, setSyncing] = React.useState(false);

    const onSyncForma = React.useCallback(async () => {
        if (!confirm("確定要將所有已開通使用者的單位、職稱同步至表單系統？")) return;
        setSyncing(true);
        try {
            const { data } = await api.post<{ updated: number }>("/Admin/users/sync-forma", {}, await authHeaders());
            alert(`同步完成，共更新 ${data.updated} 位使用者`);
        } catch (e: any) {
            alert(`同步失敗：${e?.response?.data?.message || e?.message || e}`);
        } finally {
            setSyncing(false);
        }
    }, []);

    const onProvisionForma = React.useCallback(async (u: UserListItemDto) => {
        if (u.formaRegistered) return;
        if (!u.email) { alert("該使用者尚未設定 Email，無法開通表單系統"); return; }
        if (!confirm(`確定要開通「${u.name}」的表單系統帳號？`)) return;
        setProvisioningId(u.id);
        try {
            await api.post(`/Admin/users/${u.id}/provision-forma`, {}, await authHeaders());
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`開通失敗：${e?.response?.data?.message || e?.message || e}`);
        } finally {
            setProvisioningId(null);
        }
    }, [page, debouncedQ, role, status, fetchUsers]);

    const onSendActivationEmail = React.useCallback(async (u: UserListItemDto) => {
        if (!u.email) { alert("該使用者尚未設定 Email，無法寄送通知"); return; }
        if (!confirm(`確定要寄送帳號開通通知信給「${u.name}」（${u.email}）？`)) return;
        setSendingEmailId(u.id);
        try {
            await api.post(`/Admin/users/${u.id}/send-activation-email`, {}, await authHeaders());
            alert(`已成功寄送開通通知信給 ${u.name}`);
        } catch (e: any) {
            console.error(e);
            alert(`寄信失敗：${e?.message || e}`);
        } finally {
            setSendingEmailId(null);
        }
    }, []);

    const onDelete = React.useCallback(async (u: UserListItemDto) => {
        if (!confirm(`確定刪除使用者「${u.name}」？`)) return;

        try {
            await api.delete(`/Admin/users/${u.id}`, await authHeaders());

            // 先依目前 state 計算刪除後的總數與總頁數
            const newTotal = Math.max(0, total - 1);
            const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
            const remainInPage = rows.length - 1; // 刪掉當前這筆後，這一頁還剩幾筆

            // 樂觀更新列表與總數（立刻讓 UI 反映）
            setRows(prev => prev.filter(x => x.id !== u.id));
            setTotal(newTotal);

            // 如果刪完之後當前頁碼超出最大頁，往回一頁
            if (page > newTotalPages) {
                setPage(newTotalPages); // 交給 effect 依新頁碼重抓
            } else {
                // 否則可選擇立即重抓，避免因排序/索引造成的空缺
                fetchUsers(page, debouncedQ, role, status, orgFilter);
            }
        } catch (e: any) {
            console.error(e);
            alert(`刪除失敗：${e?.message || e}`);
        }
    }, [rows.length, page, total, pageSize, debouncedQ, role, status, fetchUsers]);

    // ===== 變更機構 Modal =====
    type OrgOption = { id: number; name: string };
    const [orgList, setOrgList] = React.useState<OrgOption[]>([]);
    const [orgChangeTarget, setOrgChangeTarget] = React.useState<UserListItemDto | null>(null);
    const [orgChangeValue, setOrgChangeValue] = React.useState("");

    React.useEffect(() => {
        const fetchOrgs = async () => {
            try {
                type TreeNode = { id: number; name: string; children?: TreeNode[] };
                const { data } = await api.get<TreeNode[]>("/Admin/org/tree", await authHeaders());
                const flat: OrgOption[] = [];
                const traverse = (nodes: TreeNode[]) => {
                    for (const n of nodes) {
                        flat.push({ id: n.id, name: n.name });
                        if (n.children?.length) traverse(n.children);
                    }
                };
                traverse(data);
                setOrgList(flat);
            } catch (e) {
                console.error("載入機構清單失敗", e);
            }
        };
        fetchOrgs();
    }, []);

    const onOpenOrgChange = React.useCallback((u: UserListItemDto) => {
        setOrgChangeTarget(u);
        setOrgChangeValue("");
    }, []);

    const onConfirmOrgChange = React.useCallback(async () => {
        if (!orgChangeTarget || !orgChangeValue) return;
        const orgId = parseInt(orgChangeValue, 10);
        try {
            await api.patch(`/Admin/users/${orgChangeTarget.id}/organization`, { organizationId: orgId }, await authHeaders());
            setOrgChangeTarget(null);
            fetchUsers(page, debouncedQ, role, status, orgFilter);
        } catch (e: any) {
            console.error(e);
            alert(`變更機構失敗：${e?.message || e}`);
        }
    }, [orgChangeTarget, orgChangeValue, page, debouncedQ, role, status, fetchUsers]);

    // ===== 使用者詳情 Modal =====
    const [detailUser, setDetailUser] = React.useState<UserDetailDto | null>(null);
    const [detailLoading, setDetailLoading] = React.useState(false);

    const onViewDetail = React.useCallback(async (userId: string) => {
        setDetailLoading(true);
        try {
            const { data } = await api.get<UserDetailDto>(`/Admin/users/${userId}`, await authHeaders());
            setDetailUser(data);
        } catch (e: any) {
            console.error(e);
            alert(`載入使用者詳情失敗：${e?.message || e}`);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">使用者與角色管理</h2>
                <button
                    onClick={onSyncForma}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm"
                    title="將所有已開通使用者的單位與職稱同步至表單系統"
                >
                    <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "同步中..." : "同步表單系統資料"}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {/* 搜尋 + 篩選列 */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            type="text"
                            placeholder="搜尋使用者名稱、帳號或單位..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        type="text"
                        placeholder="角色名稱（可留空）"
                        className="w-full md:w-52 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        className="w-full md:w-52 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">全部機構</option>
                        {orgList.map((o) => (
                            <option key={o.id} value={String(o.id)}>{o.name}</option>
                        ))}
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full md:w-40 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">全部狀態</option>
                        <option value="active">啟用中</option>
                        <option value="pending">待審核</option>
                        <option value="disabled">已停用</option>
                        <option value="locked">已鎖定</option>
                    </select>
                    <button
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        onClick={() => { if (page !== 1) setPage(1); else fetchUsers(1, debouncedQ, role, status, orgFilter); }}
                        disabled={loading}
                        title="套用篩選"
                    >
                        <Filter size={20} />
                        套用
                    </button>
                </div>

                {/* 表格 */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">使用者名稱</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">帳號</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">所屬機構</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">角色</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">單位</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">狀態</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Email 驗證</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">最後登入</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {rows.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-800">{u.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{u.account}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{u.email ?? "-"}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{u.organizationName ?? "-"}</td>

                                {/* 角色欄：badge 顯示 + 編輯按鈕 */}
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-1">
                                        {u.roles.length === 0 ? (
                                            <span className="text-gray-400 text-xs">未指派</span>
                                        ) : (
                                            u.roles.map((r) => (
                                                <span key={r} className={`px-2 py-0.5 rounded text-xs font-medium ${roleClass(r)}`}>{r}</span>
                                            ))
                                        )}
                                        <button
                                            className="ml-1 text-xs text-indigo-500 hover:text-indigo-700 underline"
                                            onClick={() => onOpenRoleEdit(u)}
                                        >
                                            編輯
                                        </button>
                                    </div>
                                </td>

                                <td className="px-4 py-3 text-sm text-gray-600">{u.unit ?? "-"}</td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex flex-col gap-1">
                                        {statusChip(u.status)}
                                        {u.isLocked && (
                                            <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                                <Lock size={12} /> 已鎖定
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                            u.emailVerified
                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                        }`}
                                        title={u.emailVerified ? "點擊設為未驗證" : "點擊設為已驗證"}
                                        onClick={() => onToggleEmailVerified(u)}
                                    >
                                        {u.emailVerified ? <Mail size={14} /> : <MailX size={14} />}
                                        {u.emailVerified ? "已驗證" : "未驗證"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{fmtTime(u.lastLoginAt)}</td>

                                <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            className="text-blue-500 hover:text-blue-600"
                                            aria-label="檢視"
                                            onClick={() => onViewDetail(u.id)}
                                            disabled={detailLoading}
                                        >
                                            <Eye size={18}/>
                                        </button>
                                        <button
                                            className="text-indigo-500 hover:text-indigo-600"
                                            aria-label="變更機構"
                                            title="變更所屬機構"
                                            onClick={() => onOpenOrgChange(u)}
                                        >
                                            <Building2 size={18}/>
                                        </button>

                                        {/* 這裡不再放角色下拉 */}
                                        <button
                                            className={`${u.status === "disabled" ? "text-green-600 hover:text-green-700" : "text-gray-500 hover:text-gray-600"}`}
                                            aria-label={u.status === "disabled" ? "啟用" : "停用"}
                                            onClick={() => onToggleActive(u)}
                                            title={u.status === "disabled" ? "啟用" : "停用"}
                                        >
                                            {u.status === "disabled" ? <CheckCircle size={18}/> : <Clock size={18}/>}
                                        </button>

                                        {u.isLocked && (
                                            <button
                                                className="text-orange-500 hover:text-orange-600"
                                                aria-label="解除鎖定"
                                                title={`解除鎖定（錯誤 ${u.failedAttempts} 次，鎖定至 ${fmtTime(u.lockedUntil)}）`}
                                                onClick={() => onUnlock(u)}
                                            >
                                                <LockOpen size={18}/>
                                            </button>
                                        )}
                                        <button
                                            className={`disabled:opacity-40 ${
                                                u.formaRegistered
                                                    ? "text-green-500 cursor-default"
                                                    : u.roles.length === 0
                                                        ? "text-gray-300 cursor-not-allowed"
                                                        : "text-violet-500 hover:text-violet-700"
                                            }`}
                                            aria-label="開通表單系統"
                                            title={
                                                u.formaRegistered ? "已開通表單系統" :
                                                u.roles.length === 0 ? "需先指派角色才能開通" :
                                                !u.email ? "無 Email，無法開通" : "開通表單系統帳號"
                                            }
                                            disabled={u.formaRegistered || u.roles.length === 0 || !u.email || provisioningId === u.id}
                                            onClick={() => onProvisionForma(u)}
                                        >
                                            <UserPlus size={18}/>
                                        </button>
                                        <button
                                            className="text-teal-500 hover:text-teal-600 disabled:opacity-40"
                                            aria-label="寄送開通通知信"
                                            title={u.email ? "寄送帳號開通通知信" : "無 Email，無法寄信"}
                                            disabled={!u.email || sendingEmailId === u.id}
                                            onClick={() => onSendActivationEmail(u)}
                                        >
                                            <Send size={18}/>
                                        </button>
                                        <button
                                            className="text-red-500 hover:text-red-600"
                                            aria-label="刪除"
                                            onClick={() => onDelete(u)}
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && !loading && (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">查無資料</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* 分頁 */}
                <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
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

            {/* 角色多選 Modal */}
            {roleEditTarget && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onMouseDown={(e) => { if (e.target === e.currentTarget && !roleEditSaving) setRoleEditTarget(null); }}
                >
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-lg p-6 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setRoleEditTarget(null)}
                            disabled={roleEditSaving}
                            aria-label="關閉"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-lg font-semibold mb-1">編輯角色</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            使用者：<span className="font-medium text-gray-700">{roleEditTarget.name}</span>
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {rolesList.map((r) => (
                                <label key={r} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm checkbox-primary"
                                        checked={roleEditSelected.includes(r)}
                                        onChange={(e) => {
                                            setRoleEditSelected(prev =>
                                                e.target.checked ? [...prev, r] : prev.filter(x => x !== r)
                                            );
                                        }}
                                    />
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleClass(r)}`}>{r}</span>
                                </label>
                            ))}
                        </div>
                        {roleEditSelected.length === 0 && (
                            <p className="text-xs text-amber-600 mb-3">未選取任何角色，確認後將清除所有角色指派。</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                onClick={() => setRoleEditTarget(null)}
                                disabled={roleEditSaving}
                            >
                                取消
                            </button>
                            <button
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                onClick={onConfirmRoleEdit}
                                disabled={roleEditSaving}
                            >
                                {roleEditSaving ? "儲存中..." : "確認"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 變更機構 Modal */}
            {orgChangeTarget && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setOrgChangeTarget(null); }}
                >
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-lg p-6 relative">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setOrgChangeTarget(null)}
                            aria-label="關閉"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-lg font-semibold mb-1">變更所屬機構</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            使用者：<span className="font-medium text-gray-700">{orgChangeTarget.name}</span>
                            <br />目前機構：<span className="font-medium text-gray-700">{orgChangeTarget.organizationName ?? "-"}</span>
                        </p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">選擇新機構</label>
                        <select
                            value={orgChangeValue}
                            onChange={(e) => setOrgChangeValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                        >
                            <option value="">請選擇機構</option>
                            {orgList.map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                onClick={() => setOrgChangeTarget(null)}
                            >
                                取消
                            </button>
                            <button
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                disabled={!orgChangeValue}
                                onClick={onConfirmOrgChange}
                            >
                                確認變更
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailUser && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setDetailUser(null); }}
                >
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setDetailUser(null)}
                            aria-label="關閉"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-semibold mb-4">使用者詳情</h3>

                        <div className="space-y-3 text-sm">
                            <DetailRow label="帳號" value={detailUser.username} />
                            <DetailRow label="姓名" value={detailUser.nickname} />
                            <DetailRow label="Email" value={detailUser.email} />
                            <DetailRow label="手機" value={detailUser.mobile} />
                            <DetailRow label="組織" value={detailUser.organizationName} />
                            <DetailRow label="單位" value={detailUser.unit} />
                            <DetailRow label="職稱" value={detailUser.position} />
                            <DetailRow label="角色" value={detailUser.roles.length > 0 ? detailUser.roles.join(", ") : null} />
                            <DetailRow label="帳號狀態">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    detailUser.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                    {detailUser.isActive ? "啟用中" : "停用"}
                                </span>
                            </DetailRow>
                            <DetailRow label="Email 驗證">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    detailUser.emailVerified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                    {detailUser.emailVerified ? "已驗證" : "未驗證"}
                                </span>
                            </DetailRow>
                            <DetailRow label="Email 驗證時間" value={fmtTime(detailUser.emailVerifiedAt)} />
                            <DetailRow label="建立時間" value={fmtTime(detailUser.createdAt)} />
                            <DetailRow label="最後登入" value={fmtTime(detailUser.lastLoginAt)} />
                            <DetailRow label="密碼變更時間" value={fmtTime(detailUser.passwordChangedAt)} />
                            <DetailRow label="強制變更密碼">
                                <span className={`text-xs font-medium ${detailUser.forceChangePassword ? "text-red-600" : "text-gray-500"}`}>
                                    {detailUser.forceChangePassword ? "是" : "否"}
                                </span>
                            </DetailRow>
                            <DetailRow label="帳號鎖定">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    detailUser.isLocked ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                    {detailUser.isLocked ? <><Lock size={12} /> 已鎖定</> : "未鎖定"}
                                </span>
                            </DetailRow>
                            {detailUser.isLocked && (
                                <>
                                    <DetailRow label="鎖定至" value={fmtTime(detailUser.lockedUntil)} />
                                    <DetailRow label="錯誤次數" value={String(detailUser.failedAttempts)} />
                                </>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button className="btn btn-ghost text-black" onClick={() => setDetailUser(null)}>關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailRow({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
    return (
        <div className="flex border-b border-gray-100 pb-2">
            <span className="w-32 flex-shrink-0 font-medium text-gray-600">{label}</span>
            <span className="text-gray-800">{children ?? value ?? <span className="text-gray-400">-</span>}</span>
        </div>
    );
}