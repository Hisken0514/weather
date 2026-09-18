"use client";
import React from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { toast } from "react-hot-toast";

type OrgOption = { id: number; name: string };

export default function ImportExportView() {
    const [orgs, setOrgs] = React.useState<OrgOption[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
    const [loadingOrgs, setLoadingOrgs] = React.useState(false);
    const [downloading, setDownloading] = React.useState(false);

    const authHeaders = React.useCallback(async () => {
        const t = await getAccessToken();
        return t ? `Bearer ${t.value}` : "";
    }, []);

    React.useEffect(() => {
        const fetchOrgs = async () => {
            setLoadingOrgs(true);
            try {
                const token = await authHeaders();
                const { data } = await api.get<OrgOption[]>("/Admin/kpi/orgs-with-data", {
                    headers: { Authorization: token },
                });
                setOrgs(data);
            } catch {
                toast.error("載入機構清單失敗");
            } finally {
                setLoadingOrgs(false);
            }
        };
        fetchOrgs();
    }, [authHeaders]);

    const toggleOrg = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(selectedIds.size === orgs.length
            ? new Set()
            : new Set(orgs.map(o => o.id)));
    };

    const handleDownload = async () => {
        if (selectedIds.size === 0) {
            toast.error("請至少選擇一個廠");
            return;
        }
        setDownloading(true);
        try {
            const token = await authHeaders();
            const params = new URLSearchParams();
            selectedIds.forEach(id => params.append("orgIds", String(id)));

            const response = await api.get(`/Admin/kpi/history-export?${params}`, {
                headers: { Authorization: token },
                responseType: "blob",
            });

            const url = URL.createObjectURL(
                new Blob([response.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                })
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `KPI歷史績效_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("下載成功");
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? e?.message ?? "下載失敗");
        } finally {
            setDownloading(false);
        }
    };

    const allSelected = orgs.length > 0 && selectedIds.size === orgs.length;

    return (
        <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">歷史績效指標 Excel 下載</h3>
            <p className="text-sm text-gray-500">
                選擇一個或多個廠，下載合併成一份 Excel。每家廠為獨立工作表，包含所有歷史填報紀錄（指標名稱、填報值、達標狀態等）。
            </p>

            <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={loadingOrgs || orgs.length === 0}
                    />
                    <span className="text-sm font-medium text-gray-700">
                        全選（已選 {selectedIds.size} / {orgs.length} 個機構）
                    </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y">
                    {loadingOrgs ? (
                        <div className="py-8 text-center text-gray-400 text-sm">載入中…</div>
                    ) : orgs.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">無機構資料</div>
                    ) : (
                        orgs.map(o => (
                            <label
                                key={o.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={selectedIds.has(o.id)}
                                    onChange={() => toggleOrg(o.id)}
                                />
                                <span className="text-sm text-gray-800">{o.name}</span>
                            </label>
                        ))
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    className="btn btn-primary"
                    disabled={downloading || selectedIds.size === 0}
                    onClick={handleDownload}
                >
                    {downloading && <span className="loading loading-spinner loading-sm mr-1" />}
                    下載歷史績效 Excel
                    {selectedIds.size > 0 && `（${selectedIds.size} 個廠）`}
                </button>
                {selectedIds.size > 0 && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        清除選取
                    </button>
                )}
            </div>
        </div>
    );
}
