import React from "react";
import { useStepContext } from "../StepComponse";
import {SelectCompany, Checkdata} from "@/components/KPI/AddKPIvalue";
import {Kpi} from "@/components/ReportKPI/AddKpiValueStep2";

export default function AddKpiValueStep3() {
    const { stepData } = useStepContext();

    const company = stepData.SelectCompany as SelectCompany;
    const kpiList = (stepData.kpiDataInput as { kpiList?: Kpi[] })?.kpiList || [];
    // ✅ 從 Checkdata 取出已結構化的報告資料
    const checkdata = stepData.Checkdata as Checkdata;
    const reports = checkdata?.reports || [];


    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg">確認資料</div>
            <div className="card-body p-6 space-y-4">
                {/* 公司/工廠與年度季度 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                    <p><strong>年度：</strong> {company?.year}</p>
                    <p><strong>季度：</strong> {company?.quarter}</p>
                </div>

                {/* KPI 指標表格 */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-primary mb-3">KPI 報告內容</h3>
                    {kpiList.length === 0 ? (
                        <p className="text-gray-500">無 KPI 資料</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm w-full border">
                                <thead className="bg-base-200 text-sm text-gray-700">
                                <tr>
                                    <th>公司/工廠</th>
                                    <th>KPI 指標</th>
                                    <th>細項</th>
                                    <th>輸入值</th>
                                    <th>單位</th>
                                    <th>適用</th>
                                    <th>備註</th>
                                </tr>
                                </thead>
                                <tbody>
                                {/* 建立 Map 以加速查找 */}
                                {(() => {
                                    const reportMap = new Map(
                                        reports.map(r => [r.kpiDataId, r])
                                    );

                                    return kpiList.map((kpi: any) => {
                                        const report = reportMap.get(kpi.kpiDataId);

                                        return (
                                            <tr key={kpi.kpiDataId}>
                                                <td>{kpi.company}</td>
                                                <td>{kpi.indicatorName}</td>
                                                <td>{kpi.detailItemName}</td>
                                                <td>{report?.value ?? "-"}</td>
                                                <td>{kpi.unit}</td>
                                                <td>{report?.isSkipped ? "不適用" : "適用"}</td>
                                                <td>{report?.remark}</td>
                                            </tr>
                                        );
                                    });
                                })()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}