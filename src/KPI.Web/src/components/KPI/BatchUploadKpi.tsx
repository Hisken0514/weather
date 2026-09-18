'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import api from "@/services/apiService"
import SelectEnterprise, { SelectionPayload } from "@/components/select/selectOnlyEnterprise";

export default function BatchUploadKpi() {
    const [file, setFile] = useState<File | null>(null);
    const [orgId, setOrgId] = useState<string>("");
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { confirm } = useConfirmDialog();

    const handleSelectionChange = (payload: SelectionPayload) => {
        console.log("✅ 已選擇公司 ID：", payload.orgId); // ← 加這行
        setOrgId(payload.orgId);
    };

    // 上傳Excel，取得預覽資料
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        if (!orgId) {
            toast.error("請先選擇公司，再上傳檔案");
            e.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("organizationId", orgId); // 👈 關鍵：把 orgId 帶上

        setFile(uploadedFile);
        setIsLoading(true);

        try {
            const res = await api.post("/Kpi/import-preview", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setPreviewData(res.data);
            toast.success("檔案解析成功，請確認預覽");
        } catch (err) {
            toast.error("檔案解析失敗，請確認格式");
        } finally {
            setIsLoading(false);
            e.target.value = "";
        }
    };

    // 送出預覽資料
    const handleBatchSubmit = async () => {
        if (!orgId) {
            toast.error("請先選擇公司");
            return;
        }
        if (previewData.length === 0) {
            toast.error("請先上傳並確認預覽資料");
            return;
        }

        const confirmed = await confirm({
            title: "確認送出",
            message: `即將匯入 ${previewData.length} 筆資料，是否確認？`,
        });
        if (!confirmed) {
            toast("已取消送出");
            return;
        }

        setIsLoading(true);
        try {
            // 建議把 orgId 一起送給後端
            const payload = {
                organizationId: orgId,
                rows: previewData, // 如果後端原本就吃陣列，也可以直接送 previewData，看後端規格
            };
            const res = await api.post("/kpi/import-confirm", payload);
            toast.success(res.data.message || "批次匯入成功");
            setFile(null);
            setPreviewData([]);
        } catch (err: any) {
            const msg = err.response?.data?.message ?? "匯入失敗，請稍後再試";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const templateUrl = `${basePath}/templates/kpi-template.xlsx`;

    return (
        <div className="min-h-screen bg-gradient-to-br p-6">
            <div className="max-w-7xl mx-auto">
                {/* 上傳區域 */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SelectEnterprise onSelectionChange={handleSelectionChange}/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        </div>
                    </div>
                    <div className="space-y-6">
                        {/* 下載模板區 */}
                        <div
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Excel 範本下載</h3>
                                    <p className="text-gray-600 text-sm">請先下載標準格式範本，並依照格式填入資料</p>
                                </div>
                                <a
                                    href={templateUrl}
                                    download
                                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
                                             hover:bg-blue-700 transform hover:-translate-y-0.5"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    下載範本
                                </a>
                            </div>
                        </div>

                        {/* 分隔線 */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">上傳檔案</span>
                            </div>
                        </div>

                        {/* 文件上傳區 */}
                        <div className="relative">
                            <input
                                id="uploadFile"
                                name="uploadFile"
                                aria-label="上傳檔案"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div
                                onClick={() => document.getElementById('uploadFile')?.click()}
                                className={`
                                    relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center
                                    transition-all duration-300 hover:border-blue-400 hover:bg-blue-50
                                    ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}
                                `}
                            >
                                <div className="mx-auto flex flex-col items-center">
                                    {file ? (
                                        <>
                                            <svg className="w-12 h-12 text-green-500 mb-4" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            <p className="text-lg font-semibold text-green-700 mb-2">檔案上傳成功</p>
                                            <p className="text-sm text-green-600">{file.name}</p>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none"
                                                 stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                            </svg>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">選擇 Excel 檔案</p>
                                            <p className="text-sm text-gray-500">支援 .xlsx, .xls 格式</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading 狀態 */}
                {isLoading && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 mb-8">
                        <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
                            </div>
                            <p className="mt-6 text-lg font-medium text-gray-700">資料處理中，請稍後...</p>
                            <p className="mt-2 text-sm text-gray-500">正在解析您的 Excel 檔案</p>
                        </div>
                    </div>
                )}

                {/* 預覽資料 */}
                {!isLoading && previewData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        {/* 預覽標題 */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">📋 資料預覽</h2>
                                    <p className="text-indigo-100">共 {previewData.length} 筆資料，顯示前 5 筆</p>
                                </div>
                                <div className="bg-white/20 rounded-lg px-4 py-2">
                                    <span className="text-white font-semibold">{previewData.length} 筆</span>
                                </div>
                            </div>
                        </div>

                        {/* 表格容器 */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {[
                                        '工廠ID', '工廠', '工場/製程區', '指標類別', '領域', '指標項目', '指標細項',
                                        '單位', '是否指標', '是否應用', '循環', '基線年限', '基線值', '公式', '目標值', '備註'
                                    ].map((header, index) => (
                                        <th key={index} className="px-4 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {previewData.slice(0, 5).map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.organizationId}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.organization}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.productionSite}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.kpiCategoryName}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.fieldName}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.indicatorName}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.detailItemName}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.unit}</td>
                                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.isIndicator ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {item.isIndicator ? "是" : "否"}
                                                </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    item.isApplied ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {item.isApplied ? "是" : "否"}
                                                </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.kpiCycleName}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.baselineYear}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.baselineValue}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.comparisonOperator}</td>
                                        <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">{item.targetValue}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap max-w-xs truncate">{item.remarks}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 提交按鈕區域 */}
                        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    請確認上述資料無誤後，點擊確認送出進行批次匯入
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleBatchSubmit}
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    確認送出
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}