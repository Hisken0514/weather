/**
 * 將後端回傳的 ISO 字串當成 UTC 解析。
 * .NET 從 SQL Server 讀回 DateTime 時 Kind=Unspecified，序列化不加 Z，
 * 瀏覽器會誤當本地時間導致差 8 小時。此函式補上 Z 確保正確轉換台灣時間。
 */
function parseUtc(s: string): Date {
    return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
}

/**
 * 民國格式日期工具
 * 提供多種格式轉換函式，支援 ISO 日期與民國年制。
 */
export const ROCformatDateTools = {
    formatDate: (isoString: string): string => {
        const date = parseUtc(isoString);
        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false
        }).format(date);
    },

    formatDateTime: (isoString: string): string => {
        const date = parseUtc(isoString);
        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    },

    formatDateTimeROC: (isoString: string): string => {
        const date = parseUtc(isoString);
        const year = date.getFullYear() - 1911;
        const formattedDate = new Intl.DateTimeFormat('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);

        return `${year}/${formattedDate}`;
    },

    formatISOToROC: (isoDate: string): string => {
        const date = parseUtc(isoDate);
        const rocYear = date.getFullYear() - 1911;
        const month = date.getMonth() + 1;
        const day = date.getDate();

        return `民國${rocYear}年${month}月${day}日`;
    }
};

export { parseUtc };