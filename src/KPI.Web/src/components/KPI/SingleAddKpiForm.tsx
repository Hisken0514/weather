'use client';

import React, { useRef } from 'react';
import SelectAddKpi, { AddKpiFormData } from '@/components/select/selectAddKpi';
import { toast } from 'react-hot-toast';
import api from "@/services/apiService"
import {getAccessToken} from "@/services/serverAuthService";

export default function SingleAddKpiForm() {
    const formRef = useRef<{ getFormData: () => AddKpiFormData | null }>(null);

    const handleSubmit = async () => {
        const formData = formRef.current?.getFormData();
        if (formData) {
            const payload = {
                OrganizationId: parseInt(formData.organizationId),
                ProductionSite: formData.productionSiteName || '',
                KpiCategoryName: formData.category!,
                FieldName: formData.field!,
                IndicatorName: formData.indicatorName,
                DetailItemName: formData.detailItemName,
                Unit: formData.unit,
                IsIndicator: formData.isIndicator,
                ComparisonOperator: formData.comparisonOperator || '',
                IsApplied: true,
                BaselineYear: `${formData.baselineYear}年`,
                BaselineValue: formData.baselineValue,
                TargetValue: formData.targetValue,
                Remarks: formData.remarks || '',
                KpiCycleId:formData.kpiCycleId,
            };
            console.log("送出的 payload：", payload);
            try {
                const token = await getAccessToken();
                const res = await api.post('/Kpi/import-single', payload, {
                    // headers: {
                    //     Authorization: `Bearer ${token}`
                    // }
                });
                toast.success(res.data.message);
            } catch (err: any) {
                const msg = err.response?.data?.message ?? '匯入失敗，請稍後再試';
                toast.error(msg);
            }
        }
    };

    return (
        <>
            <div className="card bg-white shadow-xl p-6">
                <SelectAddKpi ref={formRef} />
            </div>
            <div className="flex justify-end mt-4">
                <button className="btn btn-secondary" onClick={handleSubmit}>送出</button>
            </div>
        </>
    );
}