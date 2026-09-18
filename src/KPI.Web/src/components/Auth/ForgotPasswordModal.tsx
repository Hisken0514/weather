import React, { useEffect, useRef, useState } from "react";
import api from "@/services/apiService";
import { Eye, EyeOff } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    modol?: "changepassword" | "forgotPassword";
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function ForgotPasswordModal({
                                                isOpen,
                                                onClose,
                                                modol = "forgotPassword",
                                                triggerRef,
                                            }: Props) {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<
        "idle" | "loading" | "emailSent" | "verifying" | "verified" | "resetting" | "error"
    >("idle");
    const [message, setMessage] = useState("");

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // A11y / Focus
    const dialogRef = useRef<HTMLDivElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const newPwdRef = useRef<HTMLInputElement>(null);
    const confirmPwdRef = useRef<HTMLInputElement>(null);
    const titleId = "forgot-password-title";
    const descId = "forgot-password-desc";

    const scrollFocus = (el?: HTMLElement | null) => {
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
    };

    // 簡單 email 格式驗證
    const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

    // 密碼強度
    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength <= 2) return { level: "weak", text: "弱", color: "bg-red-500" };
        if (strength === 3) return { level: "medium", text: "中等", color: "bg-yellow-500" };
        if (strength === 4) return { level: "strong", text: "強", color: "bg-green-500" };
        return { level: "very-strong", text: "很強", color: "bg-emerald-500" };
    };
    const passwordStrength = getPasswordStrength(newPassword);

    const resetForm = () => {
        setEmail("");
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        setStatus("idle");
        setMessage("");
    };

    // 開啟時鎖捲動、安排第一個焦點
    useEffect(() => {
        if (!isOpen) return;
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        const t = window.setTimeout(() => {
            if (status === "verified") scrollFocus(newPwdRef.current);
            else if (status === "emailSent" || status === "verifying") scrollFocus(codeRef.current);
            else scrollFocus(emailRef.current);
        }, 0);
        return () => {
            document.body.style.overflow = overflow;
            window.clearTimeout(t);
        };
    }, [isOpen, status]);

    // Focus trap + ESC
    useEffect(() => {
        if (!isOpen) return;
        const isFocusable = (el: HTMLElement) => {
            // 跳過 disabled / 隱藏 / aria-hidden
            if ((el as HTMLInputElement).disabled) return false;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            if (el.getAttribute("aria-hidden") === "true") return false;
            return true;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
                return;
            }
            if (e.key !== "Tab") return;
            const container = dialogRef.current;
            if (!container) return;
            const nodes = Array.from(
                container.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter(isFocusable);
            if (!nodes.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                // Shift+Tab
                if (!active || !container.contains(active) || active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOpen]);

    const handleClose = () => {
        resetForm();
        onClose();
        setTimeout(() => triggerRef?.current?.focus(), 0);
    };

    // --- 驗證 + API ---
    const handleSendEmail = async () => {
        // 必填 & 格式
        if (!email.trim()) {
            setMessage("請輸入 Email");
            scrollFocus(emailRef.current);
            return;
        }
        if (!isEmail(email)) {
            setMessage("Email 格式不正確");
            scrollFocus(emailRef.current);
            return;
        }

        setStatus("loading");
        try {
            const res = await api.post("/User/SendVerificationEmail", { email });
            if (res.status === 200) {
                setStatus("emailSent");
                setMessage("✅ 驗證信已發送，請輸入驗證碼。");
                setTimeout(() => scrollFocus(codeRef.current), 0);
            } else {
                setStatus("error");
                setMessage(res.data.message || "發送失敗，請稍後再試。");
            }
        } catch (err: any) {
            setStatus("error");
            setMessage(err.response?.data?.message || "發送失敗，請確認網路連線。");
        }
    };

    const handleVerifyCode = async () => {
        // 必填
        if (!email.trim()) {
            setMessage("請輸入 Email");
            scrollFocus(emailRef.current);
            return;
        }
        if (!isEmail(email)) {
            setMessage("Email 格式不正確");
            scrollFocus(emailRef.current);
            return;
        }
        if (!code.trim()) {
            setMessage("請輸入驗證碼");
            scrollFocus(codeRef.current);
            return;
        }

        setStatus("verifying");
        try {
            const res = await api.post("/User/VerifyEmailCode", { email, code });
            if (res.status === 200) {
                setStatus("verified");
                setMessage("✅ 驗證成功，請輸入新密碼");
                setTimeout(() => scrollFocus(newPwdRef.current), 0);
            } else {
                setStatus("emailSent");
                setMessage(res.data.message || "驗證碼錯誤，請重新輸入。");
                setTimeout(() => scrollFocus(codeRef.current), 0);
            }
        } catch (err: any) {
            setStatus("emailSent");
            setMessage(err.response?.data?.message || "驗證失敗，請稍後再試。");
            setTimeout(() => scrollFocus(codeRef.current), 0);
        }
    };

    const handleResetPassword = async () => {
        // 必填 + 強度 + 一致性
        if (!newPassword) {
            setMessage("請輸入新密碼");
            scrollFocus(newPwdRef.current);
            return;
        }
        if (!confirmPassword) {
            setMessage("請再次輸入新密碼");
            scrollFocus(confirmPwdRef.current);
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage("❌ 兩次輸入的密碼不一致");
            scrollFocus(confirmPwdRef.current);
            return;
        }
        if (passwordStrength.level !== "very-strong") {
            setMessage("❌ 密碼強度不足，請依照指示提高密碼複雜度。");
            scrollFocus(newPwdRef.current);
            return;
        }

        setStatus("resetting");
        try {
            const res = await api.post("/User/ResetPassword", { email, newPassword });
            if (res.status === 200) {
                toast.success("密碼已成功重設，請使用新密碼登入！");
                setTimeout(() => handleClose(), 1200);
            } else {
                setStatus("verified");
                setMessage(res.data.message || "重設失敗，請稍後再試。");
            }
        } catch (err: any) {
            setStatus("verified");
            setMessage(err.response?.data?.message || "重設失敗，請稍後再試。");
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div
                className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            >
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    id="forgot-password-modal"
                    className="bg-white text-black w-full max-w-md rounded-xl shadow-lg p-6 outline-none"
                >
                    <h2 id={titleId} className="text-lg font-semibold mb-2">
                        {modol === "forgotPassword" ? "🔐 忘記密碼" : "🔐 更改密碼"}
                    </h2>
                    <p id={descId} className="sr-only">
                        這是密碼重設對話框，請依序輸入信箱、驗證碼與新密碼。
                    </p>

                    {/* Email */}
                    <input
                        ref={emailRef}
                        type="email"
                        placeholder="請輸入您的信箱"
                        className="input input-bordered w-full mb-3 bg-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status !== "idle"}
                        aria-invalid={!!message && (message.includes("Email") || message.includes("信箱"))}
                    />

                    {/* Code */}
                    {(status === "emailSent" || status === "verifying" || status === "verified") && (
                        <input
                            ref={codeRef}
                            type="text"
                            placeholder="請輸入驗證碼"
                            className="input input-bordered w-full mb-3"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            disabled={status === "verified"}
                            aria-invalid={!!message && message.includes("驗證碼")}
                        />
                    )}

                    {/* New password & confirm */}
                    {status === "verified" && (
                        <>
                            <div className="mb-3">
                                <div className="relative">
                                    <input
                                        ref={newPwdRef}
                                        id="password"
                                        name="password"
                                        aria-label="輸入新密碼"
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="請輸入新密碼"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input input-bordered w-full"
                                        aria-invalid={!!message && message.includes("密碼強度")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((s) => !s)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label={showNewPassword ? "隱藏密碼" : "顯示密碼"}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* 強度條 */}
                                {newPassword && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-slate-600">密碼強度</span>
                                            <span
                                                className={`text-xs font-semibold ${
                                                    passwordStrength.level === "weak"
                                                        ? "text-red-600"
                                                        : passwordStrength.level === "medium"
                                                            ? "text-yellow-600"
                                                            : passwordStrength.level === "strong"
                                                                ? "text-green-600"
                                                                : "text-emerald-600"
                                                }`}
                                            >
                        {passwordStrength.text}
                      </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${passwordStrength.color}`}
                                                style={{
                                                    width: `${
                                                        Math.min(
                                                            passwordStrength.level === "weak" ? 25 : passwordStrength.level === "medium" ? 50 : passwordStrength.level === "strong" ? 75 : 100,
                                                            100
                                                        )
                                                    }%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        ref={confirmPwdRef}
                                        id="confirmpassword"
                                        name="confirmpassword"
                                        aria-label="再次輸入新密碼"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="確認新密碼"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input input-bordered w-full"
                                        aria-invalid={!!message && (message.includes("不一致") || message.includes("再次輸入"))}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((s) => !s)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label={showConfirmPassword ? "隱藏密碼" : "顯示密碼"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className={`text-xs mt-2 ${passwordStrength.level === "very-strong" ? "text-green-600" : "text-slate-500"}`}>
                                    密碼須包含<strong>大小寫字母、數字、特殊字元</strong>，且長度需<strong>12 字以上</strong>。
                                </p>
                            </div>
                        </>
                    )}

                    {/* 錯誤訊息：即時讀出 */}
                    {message && (
                        <p className={`text-sm mb-2 ${status === "error" ? "text-red-600" : "text-rose-600"}`} role="alert" aria-live="assertive">
                            {message}
                        </p>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={handleClose} className="btn btn-ghost text-black">
                            取消
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={status === "loading" || status === "verifying" || status === "resetting"}
                            onClick={status === "verified" ? handleResetPassword : status === "emailSent" ? handleVerifyCode : handleSendEmail}
                        >
                            {status === "loading"
                                ? "發送中..."
                                : status === "verifying"
                                    ? "驗證中..."
                                    : status === "resetting"
                                        ? "重設中..."
                                        : status === "verified"
                                            ? "重設密碼"
                                            : status === "emailSent"
                                                ? "送出"
                                                : "發送驗證信"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}