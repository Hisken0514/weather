'use client';

import React from 'react';
import api from '@/services/apiService';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/services/serverAuthService';
import { quarterHelper } from '@/helpers/quarter';

type SettingDto = {
    currentYear: number;
    currentQuarter: string;
    isLocked: boolean;
    updatedByEmail?: string | null;
    updatedAt?: string | null;
};

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : '' } };
}

const QUARTER_OPTIONS = ['Q2', 'Q4'];
const currentRocYear = new Date().getFullYear() - 1911;

export default function ReportPeriodSettingView() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [year, setYear] = React.useState(currentRocYear);
    const [quarter, setQuarter] = React.useState('Q2');
    const [isLocked, setIsLocked] = React.useState(false);
    const [meta, setMeta] = React.useState<{ by?: string | null; at?: string | null }>({});

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<SettingDto>('/Admin/kpi/report-period-setting', await authHeaders());
            setYear(data.currentYear);
            setQuarter(data.currentQuarter);
            setIsLocked(data.isLocked);
            setMeta({ by: data.updatedByEmail, at: data.updatedAt });
        } catch {
            toast.error('讀取設定失敗');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            await api.put(
                '/Admin/kpi/report-period-setting',
                { currentYear: year, currentQuarter: quarter, isLocked },
                await authHeaders()
            );
            toast.success('已儲存，填報頁面會套用這個設定');
            await load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white p-5 rounded-xl border shadow-sm max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">填報期別鎖定設定</h3>
            <p className="text-sm text-gray-500 mb-4">
                開啟鎖定後，KPI/建議事項的填報、批次匯入頁面上的「請選擇民國年度」「請選擇季度」會變成唯讀，
                固定套用這裡設定的年度/季度，使用者不能自己改選其他期別。關閉鎖定則維持原本自由選擇。
            </p>

            {loading ? (
                <div className="text-gray-400 text-sm py-6 text-center">載入中…</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex flex-col text-sm">
                            <span className="text-gray-600 mb-1">民國年度</span>
                            <input
                                type="number"
                                className="border rounded px-3 py-2"
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value || '0', 10))}
                            />
                        </label>
                        <label className="flex flex-col text-sm">
                            <span className="text-gray-600 mb-1">季度</span>
                            <select
                                className="border rounded px-3 py-2 bg-white"
                                value={quarter}
                                onChange={(e) => setQuarter(e.target.value)}
                            >
                                {QUARTER_OPTIONS.map((q) => (
                                    <option key={q} value={q}>{quarterHelper.getQuarterLabel(q)}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="flex items-center gap-2 mt-4 text-sm">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={isLocked}
                            onChange={(e) => setIsLocked(e.target.checked)}
                        />
                        <span className={isLocked ? 'font-medium text-amber-700' : 'text-gray-700'}>
                            鎖定填報年度/季度（使用者無法自行選擇其他期別）
                        </span>
                    </label>

                    <div className="mt-5 flex items-center gap-3">
                        <button
                            onClick={save}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? '儲存中…' : '儲存設定'}
                        </button>
                        {meta.by && (
                            <span className="text-xs text-gray-400">
                                上次由 {meta.by} 於 {meta.at ? new Date(meta.at).toLocaleString('zh-TW') : ''} 更新
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
