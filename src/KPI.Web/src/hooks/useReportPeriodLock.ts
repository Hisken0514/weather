import { useEffect, useState } from "react";
import api from "@/services/apiService";

export type ReportPeriodLock = {
    loading: boolean;
    isLocked: boolean;
    currentYear: number;
    currentQuarter: string;
};

/**
 * 讀取 Admin 在「填報期別鎖定設定」設的目前年度/季度＋是否鎖定。
 * 鎖定時，填報頁面的年度/季度應該改成唯讀，強制用這裡回傳的值，不給使用者自己選。
 */
export function useReportPeriodLock(): ReportPeriodLock {
    const [state, setState] = useState<ReportPeriodLock>({
        loading: true,
        isLocked: false,
        currentYear: new Date().getFullYear() - 1911,
        currentQuarter: "Q2",
    });

    useEffect(() => {
        let cancelled = false;
        api.get("/Admin/kpi/report-period-setting")
            .then(({ data }) => {
                if (cancelled) return;
                setState({
                    loading: false,
                    isLocked: !!data.isLocked,
                    currentYear: data.currentYear,
                    currentQuarter: data.currentQuarter,
                });
            })
            .catch(() => {
                // 讀不到就當作沒鎖定，維持原本可以自由選擇的行為，不擋住使用者填報
                if (!cancelled) setState((s) => ({ ...s, loading: false }));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}
