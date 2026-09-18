import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { useStepContext } from "../StepComponse";
import { BaseUserInfo } from "@/components/Auth/Register";

export type Step3Ref = {
    validateAndFocus: () => boolean;     // 供外層呼叫：驗證 & 聚焦第一個錯誤欄位
    focusField: (name: keyof BaseUserInfo) => void; // 如需手動指定聚焦
};

const Step3 = forwardRef<Step3Ref>((_props, ref) => {
    const { stepData, updateStepData } = useStepContext();

    // 個別欄位 refs
    const nameRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const unitRef = useRef<HTMLInputElement>(null);
    const positionRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);

    const base = (stepData.BaseUserInfo as BaseUserInfo) || {};
    const setBase = (patch: Partial<BaseUserInfo>) =>
        updateStepData({ BaseUserInfo: { ...base, ...patch }, baseUserInfoError: null });

    // 小工具：設定錯誤，泡泡提示，聚焦＆捲動
    const fail = (refEl: HTMLInputElement | null, msg: string) => {
        updateStepData({ baseUserInfoError: msg });
        if (refEl) {
            refEl.setCustomValidity(msg);
            refEl.reportValidity(); // 觸發原生錯誤泡泡並自動聚焦
            refEl.scrollIntoView({ behavior: "smooth", block: "center" });
            refEl.focus();
        }
        return false;
    };

    // 供外層呼叫的 API
    useImperativeHandle(ref, () => ({
        validateAndFocus: () => {
            // 先清掉所有 customValidity
            [nameRef, phoneRef, unitRef, positionRef, passwordRef, confirmRef].forEach(r =>
                r.current?.setCustomValidity("")
            );

            const { name, phone, unit, position, password, confirmPassword } = base;

            // 空值驗證（依你希望的順序）
            if (!name) return fail(nameRef.current, "請填寫姓名");
            if (!phone) return fail(phoneRef.current, "請填寫手機號碼");
            if (!unit) return fail(unitRef.current, "請填寫部門");
            if (!position) return fail(positionRef.current, "請填寫職稱");
            if (!password) return fail(passwordRef.current, "請輸入密碼");
            if (!confirmPassword) return fail(confirmRef.current, "請再次輸入密碼");

            // 手機格式（至少 8 碼數字）
            const phoneRegex = /^[0-9]{8,}$/;
            if (!phoneRegex.test(phone!)) {
                return fail(phoneRef.current, "手機號碼格式錯誤，請輸入至少 8 碼數字");
            }

            // 密碼強度（≥12；含大小寫、數字、特殊符號）
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-]{12,}$/;
            if (!passwordRegex.test(password!)) {
                return fail(passwordRef.current, "密碼需至少 12 碼，並包含大小寫字母、數字與特殊符號");
            }

            // 二次確認
            if (password !== confirmPassword) {
                return fail(confirmRef.current, "兩次密碼輸入不一致");
            }

            // 也可以順便做原生有效性檢查（多半是 OK）
            const allValid =
                [nameRef, phoneRef, unitRef, positionRef, passwordRef, confirmRef]
                    .every(r => r.current?.checkValidity());
            if (!allValid) {
                // 若有瀏覽器層級錯誤（幾乎不會），拋出第一個
                [nameRef, phoneRef, unitRef, positionRef, passwordRef, confirmRef]
                    .find(r => !r.current?.checkValidity())
                    ?.current?.reportValidity();
                return false;
            }

            updateStepData({ baseUserInfoError: null });
            return true;
        },

        focusField: (field) => {
            const map: Record<keyof BaseUserInfo, React.RefObject<HTMLInputElement>> = {
                name: nameRef,
                phone: phoneRef,
                unit: unitRef,
                position: positionRef,
                password: passwordRef,
                confirmPassword: confirmRef,
                // 若 BaseUserInfo 未含下列欄位可忽略
                email: nameRef, // 只是防守性；真正 email 在 Step1
                userName: nameRef,
            } as any;

            const target = map[field]?.current;
            target?.focus();
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }));

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBase({ [name]: value } as any);
        e.currentTarget.setCustomValidity(""); // 一輸入就清除錯誤
    };

    return (
        <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">姓名(必填)</label>
                    <input
                        ref={nameRef}
                        name="name"
                        type="text"
                        required
                        aria-label="姓名"
                        value={base.name || ""}
                        onChange={handleOnChange}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="您的姓名"
                        aria-invalid={!!(stepData as any).baseUserInfoError}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">手機號碼(必填)</label>
                    <input
                        ref={phoneRef}
                        name="phone"
                        type="tel"
                        required
                        aria-label="手機"
                        value={base.phone || ""}
                        onChange={handleOnChange}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="您的手機號碼"
                        inputMode="numeric"
                        pattern="[0-9]{8,}" // 也讓瀏覽器幫忙驗證
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">部門(必填)</label>
                    <input
                        ref={unitRef}
                        name="unit"
                        type="text"
                        required
                        aria-label="部門"
                        value={base.unit || ""}
                        onChange={handleOnChange}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="您的部門"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">職稱(必填)</label>
                    <input
                        ref={positionRef}
                        name="position"
                        type="text"
                        required
                        aria-label="職稱"
                        value={base.position || ""}
                        onChange={handleOnChange}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="您的職稱"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">密碼(必填)</label>
                <input
                    ref={passwordRef}
                    name="password"
                    type="password"
                    required
                    aria-label="設定密碼"
                    value={base.password || ""}
                    onChange={handleOnChange}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="設定密碼"
                    minLength={12}
                />
            </div>

            <div className="text-sm text-gray-600 mb-4">
                密碼原則：至少 12 個字元，並包含大小寫字母、數字與特殊符號。
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">確認密碼(必填)</label>
                <input
                    ref={confirmRef}
                    name="confirmPassword"
                    type="password"
                    required
                    aria-label="再次輸入密碼"
                    value={base.confirmPassword || ""}
                    onChange={handleOnChange}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="再次輸入密碼"
                    minLength={12}
                />
            </div>

            {(stepData as any).baseUserInfoError && (
                <div className="text-red-500 text-sm mt-2">
                    {(stepData as any).baseUserInfoError}
                </div>
            )}
        </div>
    );
});
Step3.displayName = "Step3";
export default Step3;