'use client'

import React, { useState } from "react";
import api from "@/utils/api";
import { Send, RefreshCw, PlugZap } from "lucide-react";

interface TestSendResult {
    success: boolean;
    message: string;
    mailLogId?: number;
}

interface ImapTestResult {
    success: boolean;
    message: string;
    messageCount?: number;
}

export default function MailTestView() {
    const [toEmail, setToEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<TestSendResult | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    const [imapChecking, setImapChecking] = useState(false);
    const [imapResult, setImapResult] = useState<ImapTestResult | null>(null);

    const handleTestSend = async () => {
        if (!toEmail.trim()) return;
        setSending(true);
        setSendResult(null);
        setSendError(null);
        try {
            const res = await api.post<TestSendResult>("/MailAdmin/test-send", { toEmail });
            setSendResult(res.data);
        } catch (err: any) {
            setSendError(err?.response?.data?.error || err?.message || "測試寄信失敗");
        } finally {
            setSending(false);
        }
    };

    const handleTestImap = async () => {
        setImapChecking(true);
        setImapResult(null);
        try {
            const res = await api.post<ImapTestResult>("/MailAdmin/bounce-settings/test-connection");
            setImapResult(res.data);
        } catch (err: any) {
            setImapResult({ success: false, message: err?.response?.data?.error || err?.message || "測試失敗" });
        } finally {
            setImapChecking(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-3xl space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">郵件系統測試</h3>
                <p className="text-gray-500 text-sm">
                    直接呼叫 <code className="bg-gray-100 px-1 rounded">/MailAdmin</code> 後端 API，
                    跟正式寄信（驗證信、密碼重設等）使用同一支 EmailService，僅限系統管理員使用。
                </p>
            </div>

            {/* 測試寄信 */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <span className="text-sm font-medium text-gray-700 block mb-2">測試寄信</span>
                <div className="flex gap-2">
                    <input
                        type="email"
                        className="input input-bordered input-sm flex-1"
                        placeholder="收件人信箱"
                        value={toEmail}
                        onChange={e => setToEmail(e.target.value)}
                        disabled={sending}
                    />
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={handleTestSend}
                        disabled={sending || !toEmail.trim()}
                    >
                        <Send className={`h-4 w-4 ${sending ? "animate-pulse" : ""}`} />
                        {sending ? "寄送中..." : "送出測試信"}
                    </button>
                </div>

                {sendResult && (
                    <div className={`mt-3 text-sm rounded p-3 border ${
                        sendResult.success
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                        <div className="font-medium">{sendResult.success ? "寄送成功" : "寄送失敗"}</div>
                        <div className="mt-1">{sendResult.message}</div>
                        {sendResult.mailLogId != null && (
                            <div className="mt-1 text-xs opacity-70">寄信紀錄 #{sendResult.mailLogId}，可到「寄信紀錄」頁查看</div>
                        )}
                    </div>
                )}
                {sendError && (
                    <p className="text-xs text-red-600 mt-2">{sendError}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                    「寄送成功」只代表 mail relay 收下這封信、答應幫忙轉寄，不代表已經送達收件人信箱——
                    relay 之後那段路（有沒有被收件人信箱判定成垃圾信、有沒有卡住）程式看不到，
                    要靠下面的退信監控（如果對方信箱有主動退信通知）或直接去收件匣確認。
                </p>
            </div>

            {/* IMAP 退信監控連線測試 */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">退信監控（IMAP）連線測試</span>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={handleTestImap}
                        disabled={imapChecking}
                    >
                        {imapChecking
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <PlugZap className="h-4 w-4" />}
                        {imapChecking ? "測試中..." : "測試 IMAP 連線"}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                    測試目前 appsettings.json 裡 <code className="bg-gray-100 px-1 rounded">BounceMail_Setting</code> 設定的
                    信箱能不能用 IMAP 連上（跟寄信用的 SMTP 是不同協定，要另外確認信箱有沒有開放）。
                    這裡按測試不會影響退信監控背景排程實際有沒有啟用（那個由設定檔的 Enabled 控制）。
                </p>
                {imapResult && (
                    <div className={`text-sm rounded p-3 border ${
                        imapResult.success
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                        <div className="font-medium">{imapResult.success ? "連線成功" : "連線失敗"}</div>
                        <div className="mt-1">{imapResult.message}</div>
                        {imapResult.messageCount != null && (
                            <div className="mt-1 text-xs opacity-70">信箱裡目前有 {imapResult.messageCount} 封信</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
