'use client';

import React, { useEffect, useState } from 'react';
import api from "@/services/apiService"
type CompanyCompletionRankingDto = {
    organizationId: number;
    organizationName: string;
    completedYes: number;
    completedNo: number;
    total: number;
    completionRate: number;
};
export type SuggestUncompletedDto = {
    id: number;                  // 建議項目 ID（可用來做連結）
    date: string;                // 建議日期（如 "2024-11-02"）
    suggestionContent: string;  // 建議內容
    kpiField: string;           // 所屬 KPI 類別（如「製程安全管理」）
    eventType: string;          // 建議來源活動（如「稽核會議」）
    respDept: string;           // 負責部門
    remark: string;             // 備註
    isAdopted: string;          // 參採狀態（如 "否"）
};

const RankingSug: React.FC = () => {
    const [data, setData] = useState<CompanyCompletionRankingDto[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<CompanyCompletionRankingDto | null>(null);
    const [uncompletedList, setUncompletedList] = useState<SuggestUncompletedDto[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/Report/completion-ranking', {
            params: { topN: 10 } // 👈 傳入 topN=10 作為查詢參數
        })
            .then(res => setData(res.data))
            .catch(err => console.error('資料載入失敗', err))
            .finally(() => setLoading(false));
    }, []);

    const fetchUncompleted = async (org: CompanyCompletionRankingDto) => {
        try {
            const res = await api.get('/Report/uncompleted-suggestions', {
                params: { organizationId: org.organizationId }
            });
            setSelectedOrg(org);
            setUncompletedList(res.data);
            setModalOpen(true);
        } catch (err) {
            console.error('查詢失敗', err);
        }
    };
    return (
        <div className="max-w-5xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">改善建議完成率排行</h2>

            <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">排名</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">公司名稱</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">完成率 (%)</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">完成 / 總數</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">視覺化</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">內容</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                    {loading ? (
                        [...Array(6)].map((_, idx) => (
                            <tr key={idx} className="animate-pulse">
                                <td className="px-4 py-2">
                                    <div className="h-4 w-6 bg-gray-200 rounded" />
                                </td>
                                <td className="px-4 py-2">
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <div className="h-4 w-12 bg-gray-200 rounded ml-auto" />
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                                </td>
                                <td className="px-4 py-2">
                                    <div className="h-4 w-full bg-gray-200 rounded" />
                                </td>
                                <td className="px-4 py-2">
                                    <div className="h-4 w-20 bg-gray-200 rounded" />
                                </td>
                            </tr>
                        ))
                    ) : (
                        data.map((item, index) => {
                            const percent = Math.round(item.completionRate * 100);
                            return (
                                <tr key={item.organizationId}>
                                    <td className="px-4 py-2 text-sm text-gray-800">{index + 1}</td>
                                    <td className="px-4 py-2 text-sm text-gray-800">{item.organizationName}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-800">{percent}%</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-800">
                                        {item.completedYes} / {item.total}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="w-full h-4 bg-gray-200 rounded">
                                            <div
                                                className="h-full bg-green-500 rounded"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            className="text-blue-600 hover:underline"
                                            onClick={() => fetchUncompleted(item)}
                                        >
                                            查看未完成
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>

            {modalOpen && selectedOrg && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20 z-50 transition-opacity animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl p-6 overflow-y-auto max-h-[80vh] border border-gray-300">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">
                                📝 {selectedOrg.organizationName} 未完成建議清單（共 {uncompletedList.length} 筆）
                            </h3>
                            <button
                                className="text-gray-500 hover:text-red-500 transition btn"
                                onClick={() => setModalOpen(false)}
                            >
                                ✕ 關閉
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="min-w-full text-sm text-gray-800">
                                <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3 text-left">📅 日期</th>
                                    <th className="p-3 text-left w-[40%]">📌 建議內容</th>
                                    <th className="p-3 text-left">📂 類別</th>
                                    <th className="p-3 text-left">🏛️ 會議</th>
                                    <th className="p-3 text-left">👥 部門</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                {uncompletedList.map(item => (
                                    <tr key={item.id}>
                                        <td className="p-3 whitespace-nowrap text-gray-800">{item.date}</td>
                                        <td className="p-3 whitespace-normal break-words">{item.suggestionContent}</td>
                                        <td className="p-3">{item.kpiField}</td>
                                        <td className="p-3">{item.eventType}</td>
                                        <td className="p-3">{item.respDept}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RankingSug;