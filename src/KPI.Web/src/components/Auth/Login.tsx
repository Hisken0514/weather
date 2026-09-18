'use client';

import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';
import Breadcrumbs from "@/components/Breadcrumbs";
import {userService} from "@/services/userServices";
import {UserData} from "@/types/UserType";
import {useauthStore} from "@/Stores/authStore";
import { useRouter } from 'next/navigation'
import { useMenuStore } from "@/Stores/menuStore";
import {toast, Toaster} from "react-hot-toast";
import api from "@/services/apiService"
import ForgotPasswordModal from './ForgotPasswordModal';
import EmailVerifyModal from './EmailVerifyModal';
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {Turnstile} from "@marsidev/react-turnstile";
import { Eye, EyeOff, Lock } from "lucide-react";
// import {useConfirm} from "@/hooks/FoyDialog/useConfirm";

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";


export default function Login() {
    const [usermail, setusermail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [userData, setUserData] = useState<UserData | null>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true); // 新增：追蹤驗證狀態
    const turnstile = useRef<any>(null);
    const { setIsLoggedIn, checkIsLoggedIn, isLoggedIn, checkAuthStatus } = useauthStore();
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [modelType,setModelType] = useState<"forgotPassword"|"changepassword">("forgotPassword");
    const [showEmailVerify, setShowEmailVerify] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState("");
    const { confirm } = useConfirmDialog();
    // const { confirmDialog, ConfirmComponent } = useConfirm();

    const forgotTriggerRef = useRef<HTMLButtonElement>(null);
    const [showPassword, setShowPassword] = useState(false);

    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "登入" }
    ];
    const router = useRouter();


    // 修正 1: 正確設定依賴項，避免無限迴圈
    useEffect(() => {
        let isCancelled = false; // 防止競態條件

        const checkLoginStatus = async () => {
            try {
                setIsCheckingAuth(true);
                await checkIsLoggedIn();

                // 只有在元件還未卸載時才執行後續操作
                if (!isCancelled) {
                    const currentLoginState = useauthStore.getState().isLoggedIn;
                    if (currentLoginState) {
                        router.push("/");
                    }
                }
            } catch (error) {
                console.error("檢查登入狀態失敗:", error);
            } finally {
                if (!isCancelled) {
                    setIsCheckingAuth(false);
                }
            }
        };

        checkLoginStatus();

        // 清理函數
        return () => {
            isCancelled = true;
        };
    }, []); // 修正：移除 isLoggedIn 和其他可能變化的依賴項

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage('');

        // 暫時略過驗證
        if (!captchaToken) {
            setErrorMessage("請先完成驗證");
            return;
        }

        try {
            setIsVerifying(true);
            // 暫時跳過 captcha 檢查
            const captchaResponse = await axios.post(
                `${NPbasePath}/api/verify`,
                { token: captchaToken },
                { headers: { "Content-Type": "application/json" } }
            );

            if (!captchaResponse.data.success) {
                setErrorMessage("驗證失敗，請重新嘗試");
                setIsVerifying(false);
                return;
            }

            const resp = await userService.Login(usermail, password);
            console.log("login resp:", resp);

            // A-0) Email 未驗證 → 彈出驗證 Modal
            if (resp.needEmailVerification && resp.email) {
                setVerifyEmail(resp.email);
                setShowEmailVerify(true);
                return;
            }

            // A) 密碼已過期 → 導去變更密碼頁
            if (resp.forceChangePassword) {
                setErrorMessage(resp.message || "密碼已過期，請重設密碼");
               // const confirmed =  await confirmDialog({
               //     cardTitle: "⚠️密碼已過期",
               //     message: errorMessage,
               //     buttonConfirm: "確定",
               //     buttonCancel:"取消",
               //     confirmStyle: "bg-primary",
               // });

                const confirmed = await confirm({
                    title: "更改密碼",
                    message: "密碼已過期，請重設密碼，是否繼續進入重設密碼流程?"
                });

                if (!confirmed) {
                    toast("已取消送出");
                    return;
                }
                // 開啟ForgotPasswordModal
                setModelType("changepassword");
                setShowForgotModal(true);
                return;
            }

            // B) 其他登入失敗
            if (!resp.success) {
                setErrorMessage(resp.message || "登入失敗，請稍後再試");
                return;
            }

            // C) 進入到期警示區間（當天後端只提醒一次）
            if (resp.warningMessage || resp.passwordExpiryAt) {
                const text =
                    resp.warningMessage ??
                    (() => {
                        const dt = new Date(resp.passwordExpiryAt!);
                        const ts = dt.toLocaleString("zh-TW", { hour12: false });
                        return `密碼將於 ${ts} 過期（剩餘 ${resp.daysUntilExpiry ?? ""} 天），將會強制變更密碼`;
                    })();
                localStorage.setItem("login-warning", text);
            }

            // D) 正常登入流程
            if (resp.nickname && resp.email && resp.token && resp.refreshToken) {
                setUserData({
                    nickname: resp.nickname,
                    email: resp.email,
                    token: resp.token,
                });

                await checkAuthStatus();
                setIsLoggedIn(true);
                setErrorMessage("");

                setTimeout(() => {
                    router.push("/");
                }, 100);
            } else {
                setErrorMessage(resp.message || "登入失敗，請稍後再試");
            }

        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data) {
                const data = error.response.data as any;
                if (data?.forceChangePassword) {

                    // 開啟ForgotPasswordModal
                    setShowForgotModal(true);
                    return;
                }
                setErrorMessage(data?.message || "登入失敗");
            } else {
                console.error("非預期錯誤:", error);
                setErrorMessage("網路錯誤，請稍後再試");
            }
        } finally {
            setIsVerifying(false);
            // 暫時跳過 captcha 檢查
            turnstile.current?.reset();
        }
    };

    // 如果還在檢查認證狀態，顯示載入畫面
    if (isCheckingAuth) {
        return (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8">
                <div className="text-center">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-4 text-gray-500">檢查登入狀態中...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/*{ConfirmComponent}*/}
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <div className="flex flex-1 flex-col items-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <h1 className="mt-10 text-center text-2xl sm:text-3xl leading-8 sm:leading-9 font-bold tracking-tight text-gray-900">
                        登入
                    </h1>
                </div>
                <div className="card bg-white shadow-xl w-full sm:w-96 p-6 mr-4">
                    <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                        <form onSubmit={handleSubmit}>
                            <h2 id="login-form-title" className="sr-only">
                                登入表單
                            </h2>
                            <div>
                                <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                                    輸入信箱
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={usermail}
                                        onChange={(e) => setusermail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                    />
                                </div>
                            </div>

                            <div className="pb-12">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm/6 font-medium text-gray-900"
                                    >
                                        輸入密碼
                                    </label>
                                    <div className="text-sm">
                                        <button
                                            ref={forgotTriggerRef}
                                            type="button"
                                            aria-haspopup="dialog"
                                            aria-controls="forgot-password-modal"
                                            onClick={() => {
                                                setModelType("forgotPassword");
                                                setShowForgotModal(true);
                                            }}
                                            className="custom-select font-semibold text-indigo-600 hover:text-indigo-500 underline"
                                        >
                                            忘記密碼?
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2 relative">
                                    {/* 密碼輸入框 */}
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="password"
                                        className="block w-full rounded-md bg-white px-3 pr-12 py-1.5 text-base text-gray-900
                                         outline outline-1 -outline-offset-1 outline-gray-300
                                         placeholder:text-gray-400 focus:outline focus:outline-2
                                         focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                    />

                                    {/* 右邊顯示/隱藏密碼按鈕 */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-center">
                                {/* 暫時移除 Turnstile */}
                                <Turnstile
                                    options={{language: "zh-tw"}}
                                    ref={turnstile}
                                    siteKey="0x4AAAAAABBGGF7DGYjKI4Qo"
                                    onSuccess={(token) => setCaptchaToken(token)}
                                    onError={() => setErrorMessage("驗證失敗，請重試")}
                                    onExpire={() => setCaptchaToken(null)}
                                />
                            </div>
                            <div className="grid gap-x-8">
                                <button
                                    type="submit"
                                    disabled={isVerifying}
                                    aria-label="登入"
                                    className="flex btn btn-primary w-full justify-center rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm "
                                >
                                    {isVerifying ? "驗證中..." : "登入"}
                                </button>
                            </div>
                        </form>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600">
                                還沒有帳號嗎？{' '}
                                <a className="font-semibold text-indigo-600 hover:text-indigo-500"
                                   href={`${NPbasePath}/register`}>
                                    前往註冊
                                </a>
                            </p>
                        </div>
                        {errorMessage && <p role="alert" style={{color: 'red'}}>{errorMessage}</p>}
                    </div>
                </div>
            </div>
            {/* 彈出視窗 */}
            <ForgotPasswordModal
                modol={modelType}
                isOpen={showForgotModal}
                onClose={() => setShowForgotModal(false)}
                triggerRef={forgotTriggerRef}
            />

            {/* Email 驗證 Modal */}
            {showEmailVerify && verifyEmail && (
                <EmailVerifyModal
                    email={verifyEmail}
                    onClose={() => setShowEmailVerify(false)}
                    onVerified={async () => {
                        setShowEmailVerify(false);
                        // 驗證成功後自動重新登入
                        try {
                            const resp = await userService.Login(usermail, password);
                            if (resp.success && resp.token && resp.refreshToken && resp.nickname && resp.email) {
                                setUserData({
                                    nickname: resp.nickname,
                                    email: resp.email,
                                    token: resp.token,
                                });
                                await checkAuthStatus();
                                setIsLoggedIn(true);
                                setErrorMessage("");
                                setTimeout(() => {
                                    router.push("/");
                                }, 100);
                            } else {
                                setErrorMessage(resp.message || "自動登入失敗，請重新登入");
                            }
                        } catch {
                            setErrorMessage("自動登入失敗，請重新登入");
                        }
                    }}
                />
            )}

        </>
    );
};
