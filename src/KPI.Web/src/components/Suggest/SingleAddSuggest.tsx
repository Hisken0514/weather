'use client';

import React, { useRef } from "react";
import SelectAddSuggest, {AddSuggestFormData} from "@/components/select/selectAddSuggest";
import toast from "react-hot-toast";
import api from "@/services/apiService"

export default function SingleAddSuggest() {
    const formRef = useRef<{ getFormData: () => AddSuggestFormData | null }>(null);


    const handleSubmit = async () => {
        const formData = formRef.current?.getFormData();
        if (formData) {
            const payload = {
                OrganizationId: parseInt(formData.organizationId),
                Date: formData.date,
                SuggestEventType: formData.eventType,
                Category: formData.category,
                EnCategory: formData.enCategory,
                Committee: formData.committee,
                Suggestion: formData.suggestion,
                SuggestionType:formData.suggestionType,
                Department: formData.department,
                IsAdopted: parseInt(formData.isAdopted),
                AdoptedOther: formData.adoptedOther || null,
                ImproveDetail: formData.improveDetail,
                Budget: typeof formData.budget === 'number' ? formData.budget : null,
                Manpower: typeof formData.manpower === 'number' ? formData.manpower : null,
                IsCompleted: parseInt(formData.isCompleted),
                CompletedOther: formData.completedOther || null,
                DoneYear: formData.doneYear,
                DoneMonth: formData.doneMonth,
                IsParallel: parseInt(formData.isParallel),
                ParallelOther: formData.parallelOther || null,
                ExecPlan: formData.execPlan || null,
                Remark: formData.remark || null,
            };
            console.log("送出的 payload：", payload);
            try {
                const res = await api.post('/Suggest/import-singleSuggest', payload);
                toast.success(res.data.message);
            } catch (err: any) {
                const msg = err.response?.data?.message ?? '匯入失敗，請稍後再試';
                toast.error(msg);
            }
        }
    };

    return (
        <>
            <div className="card bg-white shadow-xl p-6 mr-4 mb-6">
                <SelectAddSuggest ref={formRef} />
            </div>
            <div className="flex justify-end gap-x-8">
                <button type="button" className="btn btn-secondary" onClick={handleSubmit}>送出</button>
            </div>
        </>
    );
};