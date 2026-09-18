'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import api from "@/services/apiService"

export default function FullImportKpi() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { confirm } = useConfirmDialog();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        const formData = new FormData();
        formData.append('file', uploadedFile);
        setFile(uploadedFile);
        setIsLoading(true);

        try {
            const res = await api.post("/kpi/full-import-preview", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setPreviewData(res.data);
            console.log(res.data);
            toast.success('檔案解析成功，請確認預覽');
        } catch (err) {
            toast.error('解析失敗，請確認格式');
        } finally {
            setIsLoading(false);
            // ✅ 這裡重置 input 的值
            e.target.value = '';
        }
    };

    const handleFullImport = async () => {
        if (previewData.length === 0) {
            toast.error('請先上傳並預覽');
            return;
        }

        const confirmed = await confirm({
            title: "確認初始化匯入",
            message: `確定要匯入 ${previewData.length} 筆資料（含執行狀況）？`
        });

        if (!confirmed) {
            toast("已取消匯入");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post('/kpi/full-import-confirm', previewData); // 新的送出API
            toast.success(res.data.message || '整批匯入成功');
            setFile(null);
            setPreviewData([]);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? '匯入失敗');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">

                <label className="block text-sm font-medium text-gray-900">上傳 Excel 檔案</label>
                <input
                    id="uploadFile"
                    name="uploadFile"
                    aria-label="上傳檔案"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => document.getElementById('uploadFile')?.click()}
                    className="btn btn-outline btn-primary text-sm px-4 py-2 rounded-md"
                >
                    選擇檔案
                </button>

                {file && <p className="text-xs text-gray-500 mt-1">已選擇檔案：{file.name}</p>}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
                    <span className="ml-4 text-gray-700">處理中...</span>
                </div>
            ) : (previewData.length > 0 && (
                <div className="border p-4 bg-white rounded-md shadow">
                    <h2 className="text-sm font-semibold mb-2">預覽資料（前 5 筆）</h2>
                    <table className="w-full text-sm text-left">
                        <thead>
                        <tr>
                            <th className="border px-2 py-1">ID</th>
                            <th className="border px-2 py-1">公司</th>
                            <th className="border px-2 py-1">工場/製程區</th>
                            <th className="border px-2 py-1">領域</th>
                            <th className="border px-2 py-1">類型</th>
                            <th className="border px-2 py-1">指標名稱</th>
                            <th className="border px-2 py-1">指標細項</th>
                            <th className="border px-2 py-1">單位</th>
                            <th className="border px-2 py-1">是否是指標(否為計算項目)</th>
                            <th className="border px-2 py-1">是否使用</th>
                            <th className="border px-2 py-1">基線年份</th>
                            <th className="border px-2 py-1">基線值</th>
                            <th className="border px-2 py-1">111執行狀況</th>
                            <th className="border px-2 py-1">112執行狀況</th>
                            <th className="border px-2 py-1">113執行狀況</th>
                            <th className="border px-2 py-1">目標值</th>
                            <th className="border px-2 py-1">公式</th>
                            <th className="border px-2 py-1">備註</th>
                            <th className="border px-2 py-1">基線年份(新113年後)</th>
                            <th className="border px-2 py-1">基線值(原則上113年)</th>
                            <th className="border px-2 py-1">114執行狀況</th>
                            <th className="border px-2 py-1">目標值(116年)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {previewData.slice(0, 5).map((item, index) => (
                            <tr key={index}>
                                <td className="border px-2 py-1">{item.id}</td>
                                <td className="border px-2 py-1">{item.company}</td>
                                <td className="border px-2 py-1">{item.productionSite}</td>
                                <td className="border px-2 py-1">{item.field}</td>
                                <td className="border px-2 py-1">{item.category}</td>
                                <td className="border px-2 py-1">{item.indicatorName}</td>
                                <td className="border px-2 py-1">{item.detailItemName}</td>
                                <td className="border px-2 py-1">{item.unit}</td>
                                <td className="border px-2 py-1">{item.isIndicator ? "是" : "否"}</td>
                                <td className="border px-2 py-1">{item.isApplied ? "是" : "否"}</td>
                                <td className="border px-2 py-1">{item.baselineYear}</td>
                                <td className="border px-2 py-1">{item.baselineValue}</td>
                                <td className="border px-2 py-1">{item.reports.find((r: {
                                    year: number;
                                }) => r.year === 111)?.kpiReportValue}</td>
                                <td className="border px-2 py-1">{item.reports.find((r: {
                                    year: number;
                                }) => r.year === 112)?.kpiReportValue}</td>
                                <td className="border px-2 py-1">{item.reports.find((r: {
                                    year: number;
                                }) => r.year === 113)?.kpiReportValue}</td>
                                <td className="border px-2 py-1">{item.targetValue}</td>
                                <td className="border px-2 py-1">{item.comparisonOperator}</td>
                                <td className="border px-2 py-1">{item.remarks}</td>
                                <td className="border px-2 py-1">{item.newBaselineYear}</td>
                                <td className="border px-2 py-1">{item.newBaselineValue}</td>
                                <td className="border px-2 py-1">{item.newExecutionValue}</td>
                                <td className="border px-2 py-1">{item.newTargetValue}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end mt-4">
                        <button className="btn btn-primary" onClick={handleFullImport}>確認整批匯入</button>
                    </div>
                </div>
            ))}
        </div>
    );
}