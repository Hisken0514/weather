'use client';

import React, { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import Breadcrumbs from '@/components/Breadcrumbs';

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface FormData {
    name: string;
    email: string;
    organization: string;
    subject: string;
    message: string;
    category: string;
}
type Status = 'idle' | 'submitting' | 'retrying' | 'success' | 'error';
type Banner = { type: 'info' | 'success' | 'error'; text: string } | null;

export default function Direction() {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        organization: '',
        subject: '',
        message: '',
        category: 'general',
    });

    const [status, setStatus] = useState<Status>('idle');
    const [banner, setBanner] = useState<Banner>(null);

    const turnstileRef = useRef<any>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isTurnstileVerified, setIsTurnstileVerified] = useState<boolean>(false);

    const reqAbortRef = useRef<AbortController | null>(null);

    const breadcrumbItems = [
        { label: '首頁', href: `${NPbasePath}/home` },
        { label: '關於我們' },
    ];

    const isSubmitting = status === 'submitting' || status === 'retrying';

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (!formData.name || !formData.email || !formData.organization || !formData.subject || !formData.message) {
            setBanner({ type: 'error', text: '請填寫所有必填欄位' });
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setBanner({ type: 'error', text: '請輸入有效的電子郵件地址' });
            return false;
        }
        if (!isTurnstileVerified || !captchaToken) {
            setBanner({ type: 'error', text: '請完成人機驗證' });
            return false;
        }
        return true;
    };

    const resetCaptcha = () => {
        try {
            turnstileRef.current?.reset();
        } catch {}
        setCaptchaToken(null);
        setIsTurnstileVerified(false);
    };

    const submitForm = async () => {
        setStatus('submitting');
        setBanner({ type: 'info', text: '正在提交您的訊息…' });

        // 取消前一次請求（若有）
        reqAbortRef.current?.abort();
        const ac = new AbortController();
        reqAbortRef.current = ac;

        const payload = { ...formData, captchaToken };

        const doPost = async () =>
            fetch(`${NPbasePath}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: ac.signal,
            });

        try {
            let res = await doPost();

            // 伺服器忙碌/限流 → 簡單重試一次
            if (!res.ok && (res.status >= 500 || res.status === 429)) {
                setStatus('retrying');
                setBanner({ type: 'info', text: '連線不穩，正在重試…' });
                await new Promise(r => setTimeout(r, 800));
                res = await doPost();
            }

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || '提交失敗');
            }

            setStatus('success');
            setBanner({ type: 'success', text: '已送出，我們會盡快與您聯繫！' });
            // 清空表單
            setFormData({
                name: '',
                email: '',
                organization: '',
                subject: '',
                message: '',
                category: 'general',
            });
            resetCaptcha();
        } catch (err: any) {
            // 若是主動中止，不提示錯誤
            if (err?.name === 'AbortError') return;

            setStatus('error');
            setBanner({ type: 'error', text: err?.message || '提交失敗，請稍後再試' });
            resetCaptcha();
        } finally {
            // 清除引用
            if (reqAbortRef.current === ac) {
                reqAbortRef.current = null;
            }
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!validate()) return;
        await submitForm();
    };

    const Alert = () =>
        banner ? (
            <div
                role="status"
                className={`mb-4 alert ${
                    banner.type === 'error' ? 'alert-error' : banner.type === 'success' ? 'alert-success' : 'alert-info'
                }`}
                aria-live="polite"
            >
                <span>{banner.text}</span>
            </div>
        ) : null;

    return (
        <>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className="flex min-h-full flex-1 flex-col items-center px-6 py-12 lg:px-8">
                <div className="w-full max-w-7xl mx-auto space-y-8">
                    <h1 className="mt-10 text-center text-2xl sm:text-3xl leading-8 sm:leading-9 font-bold tracking-tight text-gray-900">
                        關於我們
                    </h1>

                    {/* 主要內容區域 - 響應式布局 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                        {/* 平台簡介區域 - 在大屏幕佔 2/3 寬度 */}
                        <div className="lg:col-span-2">
                            <div className="card bg-white shadow-xl p-6 h-fit">
                                <div className="card-body">
                                    <h2 className="card-title text-black">平台簡介</h2>
                                    <p className="text-gray-900">
                                        本平台由工安協會協助開發，整合績效指標資料庫與危險品風險分級資料庫兩大系統，為政府機構、督導機關與企業提供一站式的工業安全數位
                                        化管理工具。透過數據追蹤、督導表單填報與審查紀錄，協助各層級單位即時掌握企業的安全績效與改善進度，共同推動產業安全標準的持續提升。
                                    </p>

                                    <h2 className="mt-6 text-lg font-semibold text-gray-800">平台功能</h2>
                                    <ul className="list-disc pl-6 space-y-2 text-gray-800">
                                        <li>監管企業績效指標的達成狀況</li>
                                        <li>記錄與管理工安審查委員的審查結果與建議</li>
                                        <li>提供企業即時查閱審查紀錄與改善建議</li>
                                        <li>促進政府、企業與審查委員之間的有效溝通</li>
                                        <li>支援督導機關線上填報危險品風險分級督導表單</li>
                                        <li>提供督導成效統計與 PDF 報告下載</li>
                                    </ul>

                                    <h2 className="mt-6 text-lg font-semibold text-gray-800">使用對象</h2>
                                    <ul className="list-disc pl-6 space-y-2 text-gray-800">
                                        <li>政府單位：負責監管企業績效並制定安全政策</li>
                                        <li>企業管理者：查閱與上傳績效指標與改善建議狀況</li>
                                        <li>工安審查委員：查看提交之審查意見</li>
                                        <li>督導機關人員：線上填報危險品風險分級督導表單，並下載督導報告</li>
                                    </ul>

                                    <p className="mt-4 text-gray-800">
                                        為確保數據的準確性與安全性，本平台採用手動審核機制，僅限符合資格的政府機構與企業管理者註冊使用。
                                        我們致力於推動工業安全管理數位化，促進企業與監管機構之間的合作，共同提升產業安全標準。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 聯絡表單區域 - 在大屏幕佔 1/3 寬度，小屏幕時會移到底部 */}
                        <div className="lg:col-span-1">
                            <div className="bg-base-200 p-6 rounded-lg shadow-md h-fit sticky top-8">
                                <h2 className="text-xl font-semibold mb-4 text-base-content">聯絡表單</h2>

                                <Alert />

                                <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
                                    <div className="mb-4">
                                        <label htmlFor="name" className="block text-sm font-medium text-base-content mb-1">
                                            姓名 *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            autoComplete="name"
                                            disabled={isSubmitting}
                                            maxLength={50}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="email" className="block text-sm font-medium text-base-content mb-1">
                                            電子郵件 *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            autoComplete="email"
                                            disabled={isSubmitting}
                                            maxLength={120}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="organization" className="block text-sm font-medium text-base-content mb-1">
                                            單位/組織 *
                                        </label>
                                        <input
                                            type="text"
                                            id="organization"
                                            name="organization"
                                            value={formData.organization}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isSubmitting}
                                            maxLength={120}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="category" className="block text-sm font-medium text-base-content mb-1">
                                            問題類別 *
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isSubmitting}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="general">一般詢問</option>
                                            <option value="technical">技術支援</option>
                                            <option value="account">帳號問題</option>
                                            <option value="report">報告相關</option>
                                            <option value="tracking">問題追蹤相關</option>
                                            <option value="suggestion">建議與回饋</option>
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="subject" className="block text-sm font-medium text-base-content mb-1">
                                            主旨 *
                                        </label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isSubmitting}
                                            maxLength={140}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="message" className="block text-sm font-medium text-base-content mb-1">
                                            訊息內容 *
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            required
                                            rows={4}
                                            disabled={isSubmitting}
                                            maxLength={4000}
                                            className="w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Cloudflare Turnstile 驗證 */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-base-content mb-2">人機驗證 *</label>
                                        <div className="flex justify-center">
                                            <Turnstile
                                                ref={turnstileRef}
                                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAABBGGF7DGYjKI4Qo'}
                                                options={{ language: 'zh-tw' }}
                                                onSuccess={token => {
                                                    setCaptchaToken(token);
                                                    setIsTurnstileVerified(true);
                                                }}
                                                onError={() => {
                                                    setIsTurnstileVerified(false);
                                                    setCaptchaToken(null);
                                                    setBanner({ type: 'error', text: '驗證失敗，請重試' });
                                                }}
                                                onExpire={() => {
                                                    setIsTurnstileVerified(false);
                                                    setCaptchaToken(null);
                                                    setBanner({ type: 'error', text: '驗證逾時，請重新驗證' });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !isTurnstileVerified}
                                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-content rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                        >
                                            {isSubmitting && <span className="loading loading-spinner loading-xs" />}
                                            {isSubmitting ? (status === 'retrying' ? '重試中…' : '送出中…') : '送出'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}