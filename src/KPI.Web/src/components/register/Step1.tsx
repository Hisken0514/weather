import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useStepContext } from "../StepComponse";
import { EmailVerificationFormData } from "@/components/Auth/Register";
import api from "@/services/apiService";


export type Step1Ref = {
    focusEmail: () => void;
    getEmailInput: () => HTMLInputElement | null;
};

const Step1 = forwardRef<Step1Ref>((_props, ref) => {
    const { stepData, updateStepData } = useStepContext();
    const emailInputRef = useRef<HTMLInputElement>(null);
    const verificationError = (stepData as any).verificationError as string | null;

    const [isSending, setIsSending] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [sendError, setSendError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        focusEmail: () => {
            emailInputRef.current?.focus();
            emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
        getEmailInput: () => emailInputRef.current
    }));

    // 倒數計時器
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const current = (stepData.EmailVerificationForm as EmailVerificationFormData) || {};
        updateStepData({
            EmailVerificationForm: { ...current, [name]: value },
            verificationError: null,
        });
        // email 修改後重置驗證狀態
        setCodeSent(false);
        setCountdown(0);
        setSendError(null);
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const current = (stepData.EmailVerificationForm as EmailVerificationFormData) || {};
        updateStepData({
            EmailVerificationForm: { ...current, VerificationCode: e.target.value },
            verificationError: null,
        });
    };

    const handleSendCode = async () => {
        const email = (stepData.EmailVerificationForm as EmailVerificationFormData)?.email;
        if (!email) {
            setSendError("請先輸入電子郵件");
            return;
        }
        setSendError(null);
        setIsSending(true);
        try {
            await api.post('/Register/send-code', { email });
            setCodeSent(true);
            setCountdown(60);
        } catch (error: any) {
            const message = error?.response?.data?.message || "驗證碼發送失敗，請稍後再試";
            setSendError(message);
        } finally {
            setIsSending(false);
        }
    };

    // 發生驗證錯誤時聚焦 email 輸入框
    useEffect(() => {
        const el = emailInputRef.current;
        if (!el) return;
        if (verificationError) {
            el.setCustomValidity(verificationError);
            requestAnimationFrame(() => {
                el.reportValidity();
                el.focus();
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        } else {
            el.setCustomValidity("");
        }
    }, [verificationError]);

    const canResend = !isSending && countdown <= 0;
    const sendButtonLabel = isSending
        ? "發送中..."
        : codeSent && countdown > 0
            ? `重新發送 (${countdown}s)`
            : codeSent
                ? "重新發送"
                : "發送驗證碼";

    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg text-gray-800">請輸入電子信箱</div>
            <div className="card-body p-6">

                {/* Email 輸入 + 發送按鈕 */}
                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-800">電子郵件</label>
                    <div className="flex gap-2">
                        <input
                            ref={emailInputRef}
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={(stepData.EmailVerificationForm as EmailVerificationFormData)?.email || ""}
                            onChange={handleEmailChange}
                            className="flex-1 p-3 border rounded-md focus:outline-none text-gray-800"
                            placeholder="Email"
                            aria-invalid={!!verificationError}
                            aria-describedby={verificationError ? "email-error" : undefined}
                        />
                        <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={!canResend}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium whitespace-nowrap
                                       hover:bg-indigo-700 transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sendButtonLabel}
                        </button>
                    </div>
                    {sendError && (
                        <p className="text-red-500 text-sm mt-2">{sendError}</p>
                    )}
                    {verificationError && (
                        <div id="email-error" role="alert" aria-live="assertive" className="text-red-500 text-sm mt-2">
                            {verificationError}
                        </div>
                    )}
                </div>

                {/* 驗證碼輸入（發送後才顯示） */}
                {codeSent && (
                    <div className="mb-2">
                        <label htmlFor="VerificationCode" className="block text-sm font-medium mb-2 text-gray-800">
                            驗證碼
                            <span className="text-gray-400 font-normal ml-2 text-xs">（請檢查您的信箱，驗證碼 5 分鐘內有效）</span>
                        </label>
                        <input
                            id="VerificationCode"
                            name="VerificationCode"
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={(stepData.EmailVerificationForm as EmailVerificationFormData)?.VerificationCode || ""}
                            onChange={handleCodeChange}
                            className="w-full p-3 border rounded-md focus:outline-none text-gray-800 tracking-widest text-center text-lg"
                            placeholder="請輸入 8 位驗證碼"
                            autoComplete="one-time-code"
                        />
                    </div>
                )}

            </div>
        </div>
    );
});
Step1.displayName = "Step1";
export default Step1;
