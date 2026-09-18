'use client'

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RefreshCw, Wrench, Square } from "lucide-react";
import MarkdownMessage from "@/components/BubbleChat/MarkdownMessage";

// 空狀態時的推薦問題卡片，涵蓋「查單一廠商」「查排名」「查總覽」三種最常見的問法。
// ChatTestView 跟 AiChatDrawer 共用同一組，避免兩處各自維護一份。
export const DEFAULT_PRESET_QUESTIONS = [
    "台塑林園廠113年的績效指標達成情況如何？",
    "112年共進場督導幾次?哪一間的改善完成率最低?",
    "目前各領域（消防、環保、製程安全）的整體達標率概況？",
];

interface ToolCallRecord {
    tool: string;
    args: string;
    result: string;
}

interface ChatMessage {
    id: number;
    role: "user" | "bot";
    text: string;
    isError?: boolean;
    needsContinue?: boolean;
    stopped?: boolean;
    toolCalls?: ToolCallRecord[];
    status?: string | null;
    streaming?: boolean;
    retryText?: string;
}

/**
 * AiChatConversation
 * — 對話框本體（訊息串流、工具呼叫透明化、斷線可重試），從 /admin 的
 *   AI 聊天測試頁抽出來的共用邏輯，讓 ChatTestView 跟頭像選單的 AI 查詢
 *   助理側欄可以共用同一套實作，不用維護兩份一樣的串流/重試邏輯。
 */
export default function AiChatConversation({
    emptyHint = "輸入訊息開始對話",
    className = "",
    systemInstruction,
    presetQuestions,
    forceShowToolCallDetails = false,
}: {
    emptyHint?: string;
    className?: string;
    /** 覆蓋後端預設的 system prompt；不帶或空白就用後端的 DefaultSystemInstruction。 */
    systemInstruction?: string;
    /** 空狀態時顯示的推薦問題卡片，點了直接送出，幫助使用者知道能問什麼。 */
    presetQuestions?: string[];
    /** true 時一律顯示完整工具呼叫明細（第幾次、參數、結果），不管後台開關設什麼——
     *  給「AI 聊天測試」這種管理員驗證用途的畫面用，不受一般使用者那份顯示設定影響。 */
    forceShowToolCallDetails?: boolean;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    // 一般使用者的畫面要不要顯示「第 X 次呼叫工具」明細，讀後台開關（預設關閉，載入前先當
    // 關閉處理，避免載入完成前先閃一下完整明細又收回去）。forceShowToolCallDetails 為 true
    // 時完全跳過這支請求，一律顯示。
    const [showToolCallDetails, setShowToolCallDetails] = useState(forceShowToolCallDetails);
    useEffect(() => {
        if (forceShowToolCallDetails) return;
        let cancelled = false;
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        fetch(`${basePath}/api/Gemini/tool-call-visibility`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (!cancelled && data) setShowToolCallDetails(!!data.showToolCallDetailsToUsers); })
            .catch(() => { /* 讀不到就維持預設關閉，不擋畫面 */ });
        return () => { cancelled = true; };
    }, [forceShowToolCallDetails]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const nextMessageId = useRef(0);
    const newMessageId = () => ++nextMessageId.current;
    // state 更新是非同步/批次的，rapid double-click 或 Enter+點擊同時觸發時，
    // 第二次呼叫進來時 state 可能還沒反映第一次已經 setSending(true)，光靠
    // state 擋不住重複送出；ref 是同步的，能可靠防止同一時間送出兩個請求。
    const sendingRef = useRef(false);
    // 目前這一輪 fetch 的 AbortController，讓「停止」按鈕可以中斷 streaming——
    // 每次重新 handleSend（含自動接續）都會換一個新的，只有最新這個會被停止按鈕用到。
    const abortControllerRef = useRef<AbortController | null>(null);

    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    // 後端因為單次請求時間預算（避開外部 30 秒逾時）而喊停時，前端自動幫使用者「按繼續」，
    // 不用手動點——這個上限是防呆用的：萬一真的因為某種原因一直沒有真正完成，最多自動接
    // 這麼多次就停下來、改露出手動「繼續」按鈕，不會沒完沒了一直發請求。
    const MAX_AUTO_CONTINUES = 10;

    // continueFrom 有帶值時代表這是「重新送出」或「繼續」（不管是自動接續還是手動點按鈕）：
    // 沿用同一則機器人訊息（保留已經顯示的工具呼叫清單跟文字，不砍掉重練），並把目前為止
    // 累積到的工具結果一起送回後端，讓後端跳過已經查過的部分，直接接續，而不是整段重新查。
    // presetText 是點推薦問題卡片時直接帶入的文字，繞過 input state（避免 setInput 非同步
    // 更新還沒生效、緊接著送出時讀到舊值的問題）。
    const handleSend = async (continueFrom?: ChatMessage, presetText?: string) => {
        const text = continueFrom?.retryText ?? presetText ?? input.trim();
        if (!text || sendingRef.current) return;
        sendingRef.current = true;

        if (!continueFrom) {
            setMessages(prev => [...prev, { id: newMessageId(), role: "user", text }]);
            setInput("");
        }
        setSending(true);

        const botMessageId = continueFrom?.id ?? newMessageId();
        if (continueFrom) {
            setMessages(prev => prev.map(m =>
                m.id === botMessageId ? { ...m, isError: false, needsContinue: false, stopped: false, streaming: true } : m
            ));
        } else {
            setMessages(prev => [...prev, { id: botMessageId, role: "bot", text: "", streaming: true }]);
        }

        // 用本地變數（而不是每次都讀 React state）累積工具結果跟文字，這樣自動連續接續
        // 好幾輪時，每一輪都能立刻用到「上一輪剛結束當下」最新的資料，不會受 setState
        // 非同步、批次更新的時機影響而讀到舊值。
        let toolCallsAcc: ToolCallRecord[] = continueFrom?.toolCalls ? [...continueFrom.toolCalls] : [];
        let textAcc = continueFrom?.text ?? "";

        try {
            for (let attempt = 0; attempt <= MAX_AUTO_CONTINUES; attempt++) {
                // 有值代表上次是在「生成最終答案」這一輪被截斷：帶回去讓後端接著把答案講完，
                // 不能整段重新生一次——完整答案本身如果生成時間就超過單次請求預算，每次
                // 「繼續」都重來會永遠講不完、變成無限迴圈。空字串沒有意義，一律當作沒有。
                const partialAnswer = textAcc || undefined;

                const controller = new AbortController();
                abortControllerRef.current = controller;

                const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                const res = await fetch(`${basePath}/api/Gemini/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, priorToolCalls: toolCallsAcc, partialAnswer, systemInstruction }),
                    signal: controller.signal,
                });

                if (!res.ok || !res.body) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let sawDone = false;
                let sawError = false;
                let sawNeedContinue = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const events = buffer.split("\n\n");
                    buffer = events.pop() ?? "";

                    for (const evt of events) {
                        const line = evt.trim();
                        if (!line.startsWith("data:")) continue;
                        const jsonPart = line.slice(5).trim();
                        if (!jsonPart) continue;

                        const payload = JSON.parse(jsonPart);
                        if (payload.delta) {
                            textAcc += payload.delta;
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, text: m.text + payload.delta, status: null } : m
                            ));
                        } else if (payload.status) {
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, status: payload.status } : m
                            ));
                        } else if (payload.toolCall) {
                            toolCallsAcc = [...toolCallsAcc, payload.toolCall];
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId
                                    ? { ...m, toolCalls: [...(m.toolCalls ?? []), payload.toolCall], status: null }
                                    : m
                            ));
                        } else if (payload.error) {
                            sawError = true;
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, text: payload.error, isError: true, streaming: false, retryText: text } : m
                            ));
                        } else if (payload.needContinue) {
                            // 後端主動在單次請求時間預算內停下來（避免被外部逾時無預警砍斷），
                            // 這是預期中的正常停頓，不是錯誤——底下會自動幫使用者接續，不用
                            // 手動點按鈕，所以這裡先不把 needsContinue/streaming 狀態顯示出來。
                            sawNeedContinue = true;
                        } else if (payload.done) {
                            sawDone = true;
                        }
                    }
                }

                if (sawError) {
                    // 真的的錯誤（例如 LiteLLM 呼叫失敗）不自動重試，避免對一直失敗的請求
                    // 無限重打；停下來讓使用者看到錯誤訊息、自己決定要不要按「重新送出」。
                    return;
                }

                if (sawDone) {
                    setMessages(prev => prev.map(m =>
                        m.id === botMessageId ? { ...m, streaming: false } : m
                    ));
                    return;
                }

                // 走到這裡代表這一輪沒有正常結束：要嘛後端明確送了 needContinue，要嘛連線
                // 中途被切斷、什麼結束訊號都沒收到（sawNeedContinue 是 false 的情況）。
                // 兩種都當作「還沒講完」，在自動接續的次數上限內直接幫使用者送出下一輪，
                // 不用手動點擊；只有超過上限才停下來、改顯示手動「繼續」按鈕當保底。
                if (attempt < MAX_AUTO_CONTINUES) {
                    setMessages(prev => prev.map(m =>
                        m.id === botMessageId ? { ...m, status: "正在接續生成...", streaming: true } : m
                    ));
                    continue;
                }

                const fallbackText = sawNeedContinue
                    ? undefined
                    : (textAcc ? "\n\n⚠️ 連線中斷，回應可能不完整，請重試" : "連線中斷，回應可能已在傳輸途中遺失，請重試");
                setMessages(prev => prev.map(m => {
                    if (m.id !== botMessageId) return m;
                    return {
                        ...m,
                        text: fallbackText ? m.text + fallbackText : m.text,
                        needsContinue: true,
                        isError: !sawNeedContinue,
                        streaming: false,
                        retryText: text,
                    };
                }));
                return;
            }
        } catch (err: any) {
            if (err?.name === "AbortError") {
                // 使用者自己按停止，不是真的錯誤——保留已經生成的內容，
                // 用「繼續」按鈕讓使用者之後可以接著把答案講完，而不是當成失敗。
                setMessages(prev => prev.map(m =>
                    m.id === botMessageId
                        ? { ...m, needsContinue: !!m.text, stopped: true, streaming: false, retryText: text }
                        : m
                ));
                return;
            }
            const message = err?.message || "呼叫失敗";
            setMessages(prev => prev.map(m => {
                if (m.id !== botMessageId) return m;
                const text2 = m.text ? `${m.text}\n\n⚠️ ${message}` : message;
                return { ...m, text: text2, isError: true, streaming: false, retryText: text };
            }));
        } finally {
            sendingRef.current = false;
            setSending(false);
            abortControllerRef.current = null;
            setMessages(prev => prev.map(m =>
                m.id === botMessageId ? { ...m, streaming: false } : m
            ));
        }
    };

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-full min-h-0 ${className}`}>
            {/* 對話紀錄 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 && (
                    <div className="mt-8 space-y-4">
                        <div className="text-gray-400 text-sm text-center">{emptyHint}</div>
                        {presetQuestions && presetQuestions.length > 0 && (
                            <div className="flex flex-col gap-2 max-w-md mx-auto">
                                {presetQuestions.map((q, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.15, duration: 0.35, ease: "easeOut" }}
                                        onClick={() => handleSend(undefined, q)}
                                        className="text-left text-sm px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-primary hover:bg-primary/5 transition-colors"
                                    >
                                        {q}
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="mb-1 px-1 max-w-[80%] space-y-1">
                                {showToolCallDetails ? (
                                    msg.toolCalls.map((call, i) => (
                                        <details key={i}>
                                            <summary className="flex items-center gap-1 text-xs text-indigo-500 cursor-pointer select-none">
                                                <Wrench className="h-3 w-3" />
                                                <span>
                                                    第 {i + 1} 次呼叫工具：{call.tool}（點擊展開查詢結果）
                                                </span>
                                            </summary>
                                            <div className="mt-1 space-y-1">
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-0.5">參數</div>
                                                    <pre className="text-xs bg-gray-100 border rounded p-2 overflow-x-auto whitespace-pre-wrap">{call.args}</pre>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-400 mb-0.5">查詢結果</div>
                                                    <pre className="text-xs bg-gray-100 border rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">{call.result}</pre>
                                                </div>
                                            </div>
                                        </details>
                                    ))
                                ) : (
                                    // 後台關掉透明化明細時，只留「有沒有查資料、查了哪些工具」這個最基本的
                                    // 資訊，不顯示第幾次呼叫、原始參數、查詢結果——那些對一般使用者來說
                                    // 偏技術性，容易被誤會成系統在講奇怪的話。
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set(msg.toolCalls.map(c => c.tool))).map(toolName => (
                                            <span key={toolName} className="inline-flex items-center gap-1 text-xs text-indigo-500">
                                                <Wrench className="h-3 w-3" />
                                                已查詢：{toolName}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                                msg.role === "user"
                                    ? "bg-blue-500 text-white whitespace-pre-wrap"
                                    : msg.isError
                                        ? "bg-red-100 text-red-700 border border-red-200 whitespace-pre-wrap"
                                        : msg.needsContinue
                                            ? "bg-amber-50 text-amber-800 border border-amber-200 whitespace-pre-wrap"
                                            : "bg-white border text-gray-800 whitespace-pre-wrap"
                            }`}
                        >
                            {msg.stopped && msg.needsContinue && (
                                <div className="mb-1 text-xs font-medium text-amber-600">
                                    ■ 已中斷{msg.text ? "，已生成的內容保留在下面" : ""}
                                </div>
                            )}
                            {msg.role === "bot" && msg.text === "" && sending ? (
                                <span className="text-gray-400">{msg.status || "思考中..."}</span>
                            ) : msg.needsContinue && !msg.text ? (
                                msg.stopped
                                    ? "已中斷，還沒有任何內容，點「繼續」重新生成"
                                    : "查詢還沒結束，已經查到的資料都保留著，點「繼續」接著生成答案"
                            ) : msg.role === "bot" && !msg.isError && !msg.streaming ? (
                                <MarkdownMessage message={msg.text} className="prose prose-sm max-w-none whitespace-normal" />
                            ) : (
                                <>
                                    {msg.text}
                                    {msg.role === "bot" && msg.streaming && msg.status && (
                                        <span className="text-gray-400 italic"> {msg.status}</span>
                                    )}
                                </>
                            )}
                            {msg.isError && msg.retryText && (
                                <button
                                    className="btn btn-xs btn-outline btn-error mt-2"
                                    onClick={() => handleSend(msg)}
                                    disabled={sending}
                                >
                                    <RefreshCw className="h-3 w-3" /> 重新送出
                                </button>
                            )}
                            {msg.needsContinue && msg.retryText && (
                                <button
                                    className="btn btn-xs btn-outline btn-warning mt-2"
                                    onClick={() => handleSend(msg)}
                                    disabled={sending}
                                >
                                    <RefreshCw className="h-3 w-3" /> 繼續
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* 輸入區 */}
            <div className="flex-shrink-0 flex gap-2 p-3 border-t bg-white">
                <textarea
                    className="textarea textarea-bordered flex-1 resize-none"
                    rows={2}
                    placeholder="輸入訊息..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {sending ? (
                    <button
                        type="button"
                        className="btn btn-error"
                        onClick={handleStop}
                        title="停止生成"
                    >
                        <Square className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={() => handleSend()}
                        disabled={input.trim() === ""}
                    >
                        <Send className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
