'use client'

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RefreshCw, Wrench, Square, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import MarkdownMessage from "@/components/BubbleChat/MarkdownMessage";
import api from "@/utils/api";

interface PendingAttachment {
    id: string;
    fileName: string;
    kind: "image" | "text";
    mimeType?: string;
    base64?: string;
    extractedText?: string;
    uploading: boolean;
    error?: string;
}

const ACCEPTED_ATTACHMENT_TYPES = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx";

export const AGENT_PRESET_QUESTIONS = [
    "這份文件裡有提到消防改善的內容嗎？",
    "幫我查一下這份 Excel 裡哪幾項未達標",
    "這張照片上設備銘牌的到期日是幾號？",
];

interface ToolCallRecord {
    tool: string;
    args: string;
    result: string;
}

export interface AgentChatMessage {
    id: number;
    role: "user" | "bot";
    text: string;
    isError?: boolean;
    needsContinue?: boolean;
    toolCalls?: ToolCallRecord[];
    status?: string | null;
    streaming?: boolean;
    retryText?: string;
    /** 這一輪實際用哪個 model 回答（Tier1/Tier2 分流測試用，方便直接確認答案來源）。 */
    modelUsed?: string | null;
    tier?: "Tier1" | "Tier2" | null;
    /** 使用者這則訊息附加了哪些檔案——只存檔名/類型給畫面顯示用，不是完整附件內容。 */
    attachmentLabels?: { fileName: string; kind: "image" | "text" }[];
    /** ISO 字串。使用者/機器人訊息在前端建立時就記錄下來（歷史訊息則沿用後端存的 createdAt），
     *  純顯示用，不影響對話邏輯。 */
    createdAt?: string;
    /** 進新對話時前端自己補的招呼訊息——不是後端真的存過的一輪對話，純畫面用，
     *  用這個旗標跟真正的機器人回覆區分（例如：還在顯示招呼語時才順便秀範例問題）。 */
    isGreeting?: boolean;
}
type ChatMessage = AgentChatMessage;

const DEFAULT_GREETING = "哈囉，我是 AI 查詢助理，很高興為您服務！我可以幫您查詢 KPI 績效指標資料、稽核督導紀錄、改善建議執行進度，以及相關法規/文件內容，歡迎直接輸入您的問題，或點選下方的範例問題開始。";

const formatTimestamp = (iso?: string): string => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
};

/**
 * AgentChatConversation
 * — 打 /api/agent/chat/stream（AgentController，跟 GeminiController 完全分開的文件 RAG
 *   agent），跟 AiChatConversation 的串流/重試邏輯是同一套精神，差異是對話由後端伺服器端
 *   儲存（帶 conversationId），不是每次把整段歷史傳回去。刻意複製一份、不共用元件，
 *   避免改動既有的 AiChatConversation / AiChatDrawer 那條路。
 */
export default function AgentChatConversation({
    emptyHint = "輸入訊息開始對話",
    className = "",
    presetQuestions,
    greeting = DEFAULT_GREETING,
    initialConversationId,
    onMessagesChange,
    onConversationIdChange,
    forceShowToolCallDetails = false,
}: {
    emptyHint?: string;
    className?: string;
    presetQuestions?: string[];
    /** 進入一個全新對話時，機器人先自動發的招呼語——不會送到後端，純前端顯示。
     *  傳空字串可以關掉這個招呼語（例如某些嵌入情境不需要）。*/
    greeting?: string;
    initialConversationId?: string | null;
    /** 每次訊息列表變動都會呼叫——父層拿來做「匯出對話」用的唯讀鏡像，不影響這裡自己的邏輯。 */
    onMessagesChange?: (messages: AgentChatMessage[]) => void;
    /** conversationId 確定下來（第一則訊息送出後、或載入歷史對話時）就會呼叫一次。 */
    onConversationIdChange?: (conversationId: string | null) => void;
    /** true 時一律顯示完整工具呼叫明細（參數、結果），不管後台開關設什麼——給「AI Agent 測試」
     *  這種管理員驗證用途的畫面用，不受一般使用者那份顯示設定影響。 */
    forceShowToolCallDetails?: boolean;
}) {
    // initialConversationId 有值代表是從「對話紀錄」點進來的舊對話，訊息交給下面的
    // effect 去後端載入，這裡先留空；全新對話（沒有 initialConversationId）才在一開始就
    // 補一則招呼語，用 lazy initializer 一次到位，不用等 effect 跑完才出現、畫面才不會閃一下空的。
    const [messages, setMessages] = useState<ChatMessage[]>(() => (
        initialConversationId || !greeting
            ? []
            : [{ id: 0, role: "bot", text: greeting, createdAt: new Date().toISOString(), isGreeting: true }]
    ));
    // 一般使用者的畫面要不要顯示工具呼叫明細，讀後台開關（預設關閉）；forceShowToolCallDetails
    // 為 true 時完全跳過這支請求，一律顯示——跟 AiChatConversation 是同一套設計。
    const [showToolCallDetails, setShowToolCallDetails] = useState(forceShowToolCallDetails);
    useEffect(() => {
        if (forceShowToolCallDetails) return;
        let cancelled = false;
        api.get("/agent/tool-call-visibility")
            .then(res => { if (!cancelled) setShowToolCallDetails(!!res.data?.showToolCallDetailsToUsers); })
            .catch(() => { /* 讀不到就維持預設關閉，不擋畫面 */ });
        return () => { cancelled = true; };
    }, [forceShowToolCallDetails]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(!!initialConversationId);
    const nextMessageId = useRef(0);
    const newMessageId = () => ++nextMessageId.current;
    const sendingRef = useRef(false);
    const conversationIdRef = useRef<string | null>(initialConversationId ?? null);

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    // 使用者是不是「本來就在底部附近」——只有這樣才自動捲到最新訊息；如果使用者自己往上滑去看
    // 之前的內容，串流回答時不斷更新 messages 就不該一直把畫面拉回底部打斷他。
    const isNearBottomRef = useRef(true);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // 目前這一輪 fetch 的 AbortController，讓「停止」按鈕可以中斷 streaming——
    // 每次重新 handleSend（含自動接續）都會換一個新的，只有最新這個會被停止按鈕用到。
    const abortControllerRef = useRef<AbortController | null>(null);

    const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

    // 輸入框隨內容自動長高（Shift+Enter 換行、貼上多行文字都算），到上限就固定高度改出捲軸——
    // 每次都要先重置成 auto 再量 scrollHeight，不然只會一直長高、內容變少時不會跟著縮回去。
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [input]);

    // 記一下 conversationId 變化（第一則訊息回來時後端會給一個新的），讓父層知道目前是哪一段對話，
    // 之後「對話紀錄」清單裡才能標示出目前選到的是哪一則。
    const setConversationId = (id: string | null) => {
        conversationIdRef.current = id;
        onConversationIdChange?.(id);
    };

    // initialConversationId 有值代表是從「對話紀錄」點進來的舊對話，載入完整訊息記錄；
    // 只在掛載時跑一次（每次切換對話都是靠父層換 key 整個重新掛載這個元件，不是靠這裡的
    // useEffect 依賴陣列判斷變化）。
    useEffect(() => {
        if (!initialConversationId) return;
        let cancelled = false;
        setLoadingHistory(true);
        api.get<{ id: number; role: string; content: string; toolCallsJson: string | null; createdAt: string }[]>(
            `/agent/conversations/${initialConversationId}/messages`
        )
            .then(res => {
                if (cancelled) return;
                const loaded: ChatMessage[] = res.data.map(m => ({
                    id: newMessageId(),
                    role: m.role === "user" ? "user" : "bot",
                    text: m.content,
                    toolCalls: m.toolCallsJson ? JSON.parse(m.toolCallsJson) : undefined,
                    createdAt: m.createdAt,
                }));
                setMessages(loaded);
            })
            .catch(err => {
                if (cancelled) return;
                setMessages([{ id: newMessageId(), role: "bot", text: `載入對話紀錄失敗：${err?.response?.data?.error || err?.message || "未知錯誤"}`, isError: true }]);
            })
            .finally(() => {
                if (!cancelled) setLoadingHistory(false);
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        onMessagesChange?.(messages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    useEffect(() => {
        if (isNearBottomRef.current) {
            // block: "nearest" 只捲動 bottomRef 最近的可捲動容器（訊息區塊自己），不要跟著把
            // 外層整個頁面也捲下去——這個對話框在「AI Agent 測試」頁面是內嵌區塊（不像懸浮視窗
            // 用 fixed 定位跟頁面捲動無關），scrollIntoView 預設會把所有需要捲動的父層都捲進去
            // 對齊，導致整個頁面被拖到看見 footer。
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages, sending]);

    const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        isNearBottomRef.current = distanceFromBottom < 80;
    };

    const MAX_AUTO_CONTINUES = 10;

    const handleAttachClick = () => fileInputRef.current?.click();

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // 允許重選同一個檔案也能再次觸發 onChange
        if (files.length === 0) return;

        for (const file of files) {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setAttachments(prev => [...prev, { id, fileName: file.name, kind: "text", uploading: true }]);

            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await api.post("/agent/chat/attachment", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setAttachments(prev => prev.map(a => a.id === id ? {
                    ...a,
                    uploading: false,
                    kind: res.data.kind,
                    mimeType: res.data.mimeType,
                    base64: res.data.base64,
                    extractedText: res.data.extractedText,
                } : a));
            } catch (err: any) {
                setAttachments(prev => prev.map(a => a.id === id ? {
                    ...a,
                    uploading: false,
                    error: err?.response?.data?.error || err?.message || "上傳失敗",
                } : a));
            }
        }
    };

    const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    const handleSend = async (continueFrom?: ChatMessage, presetText?: string) => {
        const text = continueFrom?.retryText ?? presetText ?? input.trim();
        if (!text || sendingRef.current) return;
        sendingRef.current = true;
        // 使用者自己按送出/重新送出/繼續，一定要讓他看到自己剛送出的內容跟接下來的回覆，
        // 不管他剛剛滑到哪裡，這裡強制恢復「跟著捲到底部」。
        isNearBottomRef.current = true;

        // 附件只在真的送出「新訊息」時打包一次，「重新送出」「繼續」不會重複附加
        // （後端本來就只在非接續的那一輪使用 attachments，這裡順便清空畫面上的附件區）。
        const attachmentsToSend = continueFrom ? [] : attachments.filter(a => !a.uploading && !a.error);
        const attachmentLabels = attachmentsToSend.map(a => ({ fileName: a.fileName, kind: a.kind }));

        if (!continueFrom) {
            setMessages(prev => [...prev, { id: newMessageId(), role: "user", text, createdAt: new Date().toISOString(), attachmentLabels: attachmentLabels.length > 0 ? attachmentLabels : undefined }]);
            setInput("");
            setAttachments([]);
        }
        setSending(true);

        const botMessageId = continueFrom?.id ?? newMessageId();
        if (continueFrom) {
            setMessages(prev => prev.map(m =>
                m.id === botMessageId ? { ...m, isError: false, needsContinue: false, streaming: true } : m
            ));
        } else {
            setMessages(prev => [...prev, { id: botMessageId, role: "bot", text: "", createdAt: new Date().toISOString(), streaming: true }]);
        }

        let textAcc = continueFrom?.text ?? "";

        try {
            for (let attempt = 0; attempt <= MAX_AUTO_CONTINUES; attempt++) {
                const controller = new AbortController();
                abortControllerRef.current = controller;

                // 續傳（attempt > 0）只送一個「這是續傳」的旗標——真正被截斷到哪裡、工具呼叫
                // 累積到什麼結果，一律由伺服器自己保管（存在 Redis），不是像以前那樣讓瀏覽器
                // 端保管整包 priorToolCalls/partialAnswer 內容再送回來給伺服器直接信任。這樣
                // 一來封包變小很多，二來瀏覽器端沒辦法偽造一段工具查詢結果混進 AI 的回答依據。
                const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                const res = await fetch(`${basePath}/api/agent/chat/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(attempt === 0 ? {
                        text,
                        conversationId: conversationIdRef.current,
                        attachments: attachmentsToSend.map(a => ({
                            kind: a.kind,
                            fileName: a.fileName,
                            mimeType: a.mimeType,
                            base64: a.base64,
                            extractedText: a.extractedText,
                        })),
                    } : {
                        conversationId: conversationIdRef.current,
                        continue: true,
                    }),
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
                        if (payload.conversationId) {
                            setConversationId(payload.conversationId);
                        } else if (payload.modelUsed !== undefined) {
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, modelUsed: payload.modelUsed, tier: payload.tier } : m
                            ));
                        } else if (payload.delta) {
                            textAcc += payload.delta;
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, text: m.text + payload.delta, status: null } : m
                            ));
                        } else if (payload.status) {
                            setMessages(prev => prev.map(m =>
                                m.id === botMessageId ? { ...m, status: payload.status } : m
                            ));
                        } else if (payload.toolCall) {
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
                            sawNeedContinue = true;
                        } else if (payload.done) {
                            sawDone = true;
                        }
                    }
                }

                if (sawError) {
                    return;
                }

                if (sawDone) {
                    setMessages(prev => prev.map(m =>
                        m.id === botMessageId ? { ...m, streaming: false } : m
                    ));
                    return;
                }

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
                        ? { ...m, needsContinue: !!m.text, streaming: false, retryText: text }
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col h-full min-h-0 ${className}`}>
            {/* 範例問題釘在對話區最上方，不跟著招呼語一起貼底部——只在全新對話（只有一則
                招呼語、還沒有真的問過問題）時顯示，一旦開始對話就不再佔位置。 */}
            {!loadingHistory && messages.length === 1 && messages[0].isGreeting && presetQuestions && presetQuestions.length > 0 && (
                <div className="flex-none p-4 pb-0 bg-gray-50">
                    <div className="flex flex-col gap-2 max-w-md mx-auto">
                        {presetQuestions.map((q, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15, duration: 0.35, ease: "easeOut" }}
                                onClick={() => handleSend(undefined, q)}
                                className="text-left text-sm px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                                {q}
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
            {/* justify-end 不能直接放在這層可捲動的容器上：Chrome 對「overflow:auto +
                flex-direction:column + justify-content:flex-end」這個組合有個已知 bug，
                內容一旦超出容器高度、需要往上捲看更早的訊息時，捲動範圍會被算錯，捲不上去
                （Firefox 沒有這個問題）。改成外層純粹負責捲動，實際要「訊息少時貼齊底部」
                這個效果交給下面內層 wrapper 的 min-h-full + justify-end 處理——內層本身不捲動，
                不會踩到 Chrome 這個 bug。 */}
            <div ref={scrollContainerRef} onScroll={handleMessagesScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 bg-gray-50">
              <div className="min-h-full flex flex-col justify-end space-y-3">
                {loadingHistory && (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-md text-gray-400" />
                    </div>
                )}
                {!loadingHistory && messages.length === 0 && (
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
                        {msg.role === "user" && msg.attachmentLabels && msg.attachmentLabels.length > 0 && (
                            <div className="mb-1 flex flex-wrap justify-end gap-1 max-w-[80%]">
                                {msg.attachmentLabels.map((a, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 text-[11px] px-2 py-0.5">
                                        {a.kind === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                        <span className="max-w-[120px] truncate">{a.fileName}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="mb-1 px-1 max-w-[80%] space-y-1">
                                {showToolCallDetails ? (
                                    msg.toolCalls.map((call, i) => (
                                        <details key={i}>
                                            <summary className="flex items-center gap-1 text-xs text-indigo-500 cursor-pointer select-none">
                                                <Wrench className="h-3 w-3" />
                                                <span>{call.tool}（點擊展開查詢結果）</span>
                                            </summary>
                                            <div className="mt-1">
                                                <pre className="text-xs bg-gray-100 border rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">{call.result}</pre>
                                            </div>
                                        </details>
                                    ))
                                ) : (
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
                            {msg.role === "bot" && msg.text === "" && sending ? (
                                <span className="inline-flex items-center gap-1.5 text-gray-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {msg.status || "思考中..."}
                                </span>
                            ) : msg.needsContinue && !msg.text ? (
                                "查詢還沒結束，已經查到的資料都保留著，點「繼續」接著生成答案"
                            ) : msg.role === "bot" && !msg.isError && !msg.streaming ? (
                                <MarkdownMessage message={msg.text} className="prose prose-sm max-w-none whitespace-normal" />
                            ) : (
                                <>
                                    {msg.text}
                                    {msg.role === "bot" && msg.streaming && msg.status && (
                                        <span className="inline-flex items-center gap-1 text-gray-400 italic">
                                            <Loader2 className="h-3 w-3 animate-spin" /> {msg.status}
                                        </span>
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
                        {msg.createdAt && (
                            <div className="mt-0.5 px-1 text-[10.5px] text-gray-400">{formatTimestamp(msg.createdAt)}</div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_TYPES}
                className="hidden"
                onChange={handleFilesSelected}
            />

            {attachments.length > 0 && (
                <div className="flex-shrink-0 flex flex-wrap gap-1.5 px-2.5 sm:px-3.5 pt-2 bg-base-200">
                    {attachments.map(a => (
                        <div key={a.id} className={`flex items-center gap-1.5 rounded-lg border pl-2 pr-1 py-1 text-[11px] ${a.error ? "border-red-300 bg-red-50 text-red-600" : "border-base-300 bg-base-100"}`}>
                            {a.uploading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : a.kind === "image" ? (
                                <ImageIcon className="w-3 h-3 flex-shrink-0" />
                            ) : (
                                <FileText className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="max-w-[120px] truncate" title={a.error || a.fileName}>{a.error ? `${a.fileName}（${a.error}）` : a.fileName}</span>
                            <button onClick={() => removeAttachment(a.id)} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-base-300 flex-shrink-0">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-shrink-0 flex items-end gap-2 p-2.5 sm:p-3.5 bg-base-200 border-t border-base-300">
                <button
                    type="button"
                    title="附加檔案"
                    onClick={handleAttachClick}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base-content/60 hover:bg-base-300/60 hover:text-base-content transition-colors flex-none mb-0.5"
                >
                    <Paperclip className="h-4 w-4" />
                </button>
                <div className="flex-1 rounded-2xl border border-base-300 bg-base-100 transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                    <textarea
                        ref={textareaRef}
                        className="w-full resize-none bg-transparent text-sm leading-normal min-h-[24px] max-h-[120px] overflow-y-auto px-4 py-2 outline-none placeholder:text-base-content/40"
                        rows={1}
                        placeholder="輸入訊息…（Shift+Enter 換行）"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {sending ? (
                    <button
                        type="button"
                        className="btn btn-error btn-circle w-9 h-9 sm:w-10 sm:h-10 min-h-0 p-0 flex-shrink-0 mb-0.5"
                        onClick={handleStop}
                        title="停止生成"
                    >
                        <Square className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        className="btn btn-primary btn-circle transition-all duration-200 hover:scale-105 active:scale-95 w-9 h-9 sm:w-10 sm:h-10 min-h-0 p-0 flex-shrink-0 mb-0.5"
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
