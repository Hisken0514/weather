import React from "react";
import { useStepContext } from "../StepComponse";
import {BaseUserInfo, EmailVerificationFormData, UserInfo} from "@/components/Auth/Register";



export default function Step4() {
    const { stepData} = useStepContext();
    const EmailData = stepData.EmailVerificationForm as EmailVerificationFormData;
    const baseInfo = stepData.BaseUserInfo as BaseUserInfo;
    const userInfo = stepData.UserInfo as UserInfo;

    return (
        <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div><strong>姓名：</strong>{baseInfo.name}</div>
                <div><strong>Email：</strong>{EmailData.email}</div>
                <div><strong>手機：</strong>{baseInfo.phone}</div>
                <div><strong>公司：</strong>{userInfo.organizationName}</div>
                <div><strong>部門：</strong>{baseInfo.unit}</div>
                <div><strong>職稱：</strong>{baseInfo.position}</div>
                <div><strong>密碼：</strong>●●●●●●●●（安全考量不顯示明文）</div>
            </div>

        </div>

    );
}