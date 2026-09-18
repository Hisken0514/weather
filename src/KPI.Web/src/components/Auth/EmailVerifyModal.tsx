import React, { useEffect, useRef, useState } from "react";
import api from "@/services/apiService";

interface Props {
    email: string;
    onClose: () => void;
    onVerified: () => void;
}

type Status = "sending" | "codeSent" | "verifying" | "success" | "error";

export default function EmailVerifyModal({ email, onClose, onVerified }: Props) {
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<Status>("sending");
    const [message, setMessage] = useState("");
    const [cooldown, setCooldown] = useState(0);

    const dialogRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const titleId = "email-verify-title";
    const descId = "email-verify-desc";

    // 自動發送驗證碼（防止 Strict Mode 重複發送）
    const hasSentRef = useRef(false);
    useEffect(() => {
        if (hasSentRef.current) return;
        hasSentRef.current = true;
        sendCode();
    }, []);

    // 冷卻倒數計時
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // 發送完成後聚焦驗證碼輸入框
    useEffect(() => {
        if (status === "codeSent" || status === "error") {
            setTimeout(() => codeRef.current?.focus(), 0);
        }
    }, [status]);

    // Focus trap + ESC
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key !== "Tab") return;
            const container = dialogRef.current;
            if (!container) return;
            const nodes = Array.from(
                container.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );
            if (!nodes.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (!active || !container.contains(active) || active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    // 鎖定背景捲動
    useEffect(() => {
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = overflow;
        };
    }, []);

    const sendCode = async () => {
        setStatus("sending");
        setMessage("");
        try {
            const res = await api.post("/User/SendVerificationEmail", { email });
            if (res.status === 200) {
                setStatus("codeSent");
                setMessage("驗證碼已發送至您的信箱，請查收。");
                setCooldown(60);
            } else {
                setStatus("error");
                setMessage("發送失敗，請稍後再試。");
            }
        } catch (err: any) {
            setStatus("error");
            setMessage(err.response?.data?.message || "發送失敗，請確認網路連線。");
        }
    };

    const handleVerify = async () => {
        if (!code.trim()) {
            setMessage("請輸入驗證碼");
            codeRef.current?.focus();
            return;
        }

        setStatus("verifying");
        setMessage("");
        try {
            const res = await api.post("/User/VerifyEmailCode", { email, code });
            if (res.status === 200) {
                setStatus("success");
                setMessage("Email 驗證成功！即將自動登入...");
                setTimeout(() => onVerified(), 1000);
            } else {
                setStatus("codeSent");
                setMessage(res.data.message || "驗證碼錯誤，請重新輸入。");
                codeRef.current?.focus();
            }
        } catch (err: any) {
            setStatus("codeSent");
            setMessage(err.response?.data?.message || "驗證失敗，請稍後再試。");
            codeRef.current?.focus();
        }
    };

    const handleResend = () => {
        if (cooldown > 0) return;
        setCode("");
        sendCode();
    };

    const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            onMouseDown={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="bg-white text-black w-full max-w-md rounded-xl shadow-lg p-6 outline-none"
            >
                <h2 id={titleId} className="text-lg font-semibold mb-2">
                    Email 驗證
                </h2>

                <p id={descId} className="text-sm text-gray-600 mb-4">
                    每月首次登入需要驗證您的 Email，驗證碼已發送至 <strong>{email}</strong>
                </p>

                {/* 驗證碼輸入 */}
                <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="請輸入 8 碼驗證碼"
                    className="input input-bordered w-full mb-3 bg-white"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={status === "sending" || status === "verifying" || status === "success"}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && status === "codeSent") handleVerify();
                    }}
                />

                {/* 訊息 */}
                {message && (
                    <p
                        className={`text-sm mb-3 ${
                            status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-600"
                        }`}
                        role="alert"
                        aria-live="assertive"
                    >
                        {message}
                    </p>
                )}

                {/* 重新發送 */}
                {(status === "codeSent" || status === "error") && (
                    <p className="text-sm text-gray-500 mb-3">
                        沒有收到？
                        <button
                            type="button"
                            disabled={cooldown > 0}
                            onClick={handleResend}
                            className="text-indigo-600 hover:text-indigo-500 underline disabled:text-gray-400 disabled:no-underline ml-1"
                        >
                            {cooldown > 0 ? `重新發送 (${cooldown}s)` : "重新發送"}
                        </button>
                    </p>
                )}

                {/* 按鈕 */}
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost text-black"
                        disabled={status === "success"}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={status === "sending" || status === "verifying" || status === "success"}
                        onClick={handleVerify}
                    >
                        {status === "sending"
                            ? "發送中..."
                            : status === "verifying"
                                ? "驗證中..."
                                : status === "success"
                                    ? "驗證成功"
                                    : "確認驗證"}
                    </button>
                </div>
            </div>
        </div>
    );
}
