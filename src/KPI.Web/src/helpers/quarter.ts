const QUARTER_LABELS: Record<string, string> = {
    Q2: "年度績效檢討（前一年度整體執行成果）",
    Q4: "年度改善追蹤（當年度 1–9 月執行情況）",
};

const getQuarterLabel = (period: string): string => {
    return QUARTER_LABELS[period] ?? period;
};

export const quarterHelper = {
    getQuarterLabel,
};
