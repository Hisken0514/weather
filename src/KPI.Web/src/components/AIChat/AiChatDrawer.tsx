'use client'

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, MessageCircle, Maximize2, Minimize2, Plus, History as HistoryIcon, Download, Trash2, MoreVertical, Pencil, Pin, PinOff } from "lucide-react";
import { useAiChatStore } from "@/Stores/aiChatStore";
import { useConfirm } from "@/hooks/FoyDialog/useConfirm";
import api from "@/utils/api";
import AgentChatConversation from "@/components/AIChat/AgentChatConversation";
import type { AgentChatMessage } from "@/components/AIChat/AgentChatConversation";
// 空狀態的推薦問題卡片沿用舊版 Gemini 那三題（使用者熟悉、且是 KPI 查詢情境），
// 不用 AgentChatConversation 自己那組文件 RAG 導向的範例問題（那組是給「AI Agent 測試」頁
// 驗證文件查詢用的，跟懸浮視窗這個一般使用者最常接觸的入口情境不同）。
import { DEFAULT_PRESET_QUESTIONS } from "@/components/AIChat/AiChatConversation";

const SIDE_STORAGE_KEY = "ai-chat-floating-window-side";
const MARGIN = 24;
const EDGE_SNAP = 12;
const SIZE = { width: 380, height: 560 };

type Side = "left" | "right";
interface Pos { left: number; top: number }
interface ConversationSummary {
    id: string;
    title: string | null;
    isPinned: boolean;
    lastMessageAt: string;
}

const headerIconBtnClass = "w-[30px] h-[30px] rounded-lg flex items-center justify-center text-base-content/60 hover:bg-base-300/60 hover:text-base-content transition-colors flex-none";

/**
 * AiChatDrawer
 * — 從右下角浮動按鈕觸發，開啟成一個貼邊的小浮動視窗（不是撐滿整個畫面高度的側欄）。
 *   拖曳標題列可以移動位置，放開時依落點左右吸附到最近的邊；標題列上的「最大化」按鈕可以
 *   切成全螢幕模式，再點一次縮回浮動視窗。尺寸固定，不開放使用者自己拉伸調整。
 *   內部對話改回走 AI Agent 系統（AgentChatConversation，/api/agent/chat/stream）——文件 RAG
 *   已經穩定到可以開放一般使用者，對話由後端伺服器端儲存，所以這裡才做得出「新增對話／
 *   對話紀錄／匯出對話」，伺服器端本來就已經有對應的 conversations API（且已經照 UserId
 *   做隔離，各自只看得到自己的對話）。工具呼叫明細要不要顯示給使用者看，是另外由後台
 *   「AI Agent」設定頁的開關控制（AgentChatConversation 內部自己讀，這裡不用管）。
 */
export default function AiChatDrawer() {
    const { isOpen, close } = useAiChatStore();
    const { confirmDialog, ConfirmComponent } = useConfirm();
    const [fullscreen, setFullscreen] = useState(false);
    const [side, setSide] = useState<Side>("right");
    const [pos, setPos] = useState<Pos | null>(null); // null = 用預設位置（貼著 side 那一邊的右下角）
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

    // conversationKey 只在使用者明確按「新對話」或點一則歷史紀錄時才變動，變動會讓
    // AgentChatConversation 整個重新掛載（靠 React key），觸發它內部載入 loadTargetId 對應
    // 的歷史訊息（或掛載成全新空對話）。activeConversationId 則是單純的鏡像，用來在歷史清單
    // 標示「目前選到哪一則」跟匯出檔名，它會被 onConversationIdChange 自動更新（第一則訊息
    // 送出後後端才會給一個新的 conversationId）——這個自動更新不能拿去當 key 用，不然每次
    // 一有新 conversationId 就會觸發重新掛載，把剛打完的對話整個洗掉。
    const [conversationKey, setConversationKey] = useState(0);
    const [loadTargetId, setLoadTargetId] = useState<string | null>(null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [mirrorMessages, setMirrorMessages] = useState<AgentChatMessage[]>([]);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    // 無限捲動：hasMoreConversations 是後端說「這一頁之後還有沒有」，loadingMoreConversations
    // 只管「載下一頁中」這個 loading 狀態（跟 loadingConversations 分開，避免捲到底載下一頁時
    // 又跳出整個側欄的載入中畫面，蓋掉已經看得到的內容）。
    const [hasMoreConversations, setHasMoreConversations] = useState(false);
    const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
    const CONVERSATION_PAGE_SIZE = 30;
    // 每一列的「⋮」選單（重新命名／釘選／封存／刪除），一次只開一個，點其他地方會關掉。
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    // 重新命名走行內編輯（title 換成 input），不用另外跳輸入框。
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // 開頁面時讀回上次吸附的邊，位置本身不記（每次固定重新貼那一邊的右下角算，避免瀏覽器
    // 縮放過後浮動視窗卡在看不到的地方）。
    useEffect(() => {
        const saved = localStorage.getItem(SIDE_STORAGE_KEY);
        if (saved === "left" || saved === "right") setSide(saved);
    }, []);

    // 這個元件是 'use client'，但 Next.js 仍會在伺服器端算一次初始 HTML——SSR 階段沒有
    // window，這裡要擋一下，先給個安全預設值，掛載後的 effect/事件處理都是純瀏覽器端執行，
    // 不會有這個問題。
    const defaultPos = (s: Side): Pos => {
        if (typeof window === "undefined") return { left: 0, top: 0 };
        return {
            left: s === "left" ? MARGIN : Math.max(8, window.innerWidth - SIZE.width - MARGIN),
            top: Math.max(8, window.innerHeight - SIZE.height - MARGIN),
        };
    };

    const clampPos = (left: number, top: number): Pos => ({
        left: Math.max(8, Math.min(left, window.innerWidth - SIZE.width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - SIZE.height - 8)),
    });

    const currentPos = pos ?? defaultPos(side);

    const handleDragMouseDown = (e: React.MouseEvent) => {
        // 標題列上的按鈕（新對話/歷史/匯出/最大化/關閉）點擊不算拖曳；全螢幕模式下位置固定，不能拖。
        if (fullscreen || (e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: currentPos.left, startTop: currentPos.top };
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;

        // 拖曳時滑鼠移動很容易連帶選取到頁面上的文字，關掉選取讓拖曳體驗乾淨一點。
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = "none";

        const handleMouseMove = (e: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            setPos(clampPos(drag.startLeft + (e.clientX - drag.startX), drag.startTop + (e.clientY - drag.startY)));
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
            // 放開時依落點中心點靠左/靠右吸附到最近的邊，貼齊固定邊界，不是停在鬆手當下那個座標。
            setPos(prev => {
                if (!prev) return prev;
                const center = prev.left + SIZE.width / 2;
                const nextSide: Side = center < window.innerWidth / 2 ? "left" : "right";
                setSide(nextSide);
                localStorage.setItem(SIDE_STORAGE_KEY, nextSide);
                const snappedLeft = nextSide === "left" ? EDGE_SNAP : Math.max(EDGE_SNAP, window.innerWidth - SIZE.width - EDGE_SNAP);
                return { left: snappedLeft, top: prev.top };
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    // 視窗縮小時，把貼死的位置重新夾回畫面範圍內，避免浮動視窗被卡在看不到的地方。
    useEffect(() => {
        const handleResize = () => {
            setPos(prev => (prev ? clampPos(prev.left, prev.top) : prev));
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 點選單以外的任何地方都關掉目前開著的那個「⋮」選單——選單本身的按鈕都有 stopPropagation，
    // 不會被這裡誤關。
    useEffect(() => {
        if (!openMenuId) return;
        const handleOutsideClick = () => setOpenMenuId(null);
        window.addEventListener("click", handleOutsideClick);
        return () => window.removeEventListener("click", handleOutsideClick);
    }, [openMenuId]);

    const loadConversations = async () => {
        setLoadingConversations(true);
        try {
            const res = await api.get<{ items: ConversationSummary[]; hasMore: boolean }>(
                "/agent/conversations", { params: { skip: 0, take: CONVERSATION_PAGE_SIZE } }
            );
            setConversations(res.data.items);
            setHasMoreConversations(res.data.hasMore);
        } catch (err) {
            console.error("載入對話紀錄失敗：", err);
        } finally {
            setLoadingConversations(false);
        }
    };

    // 捲到底載下一頁——用目前已經載入的筆數當 skip，不用另外自己管頁碼。重新整理/釘選/
    // 刪除都是直接改 conversations 這個 state 本身（不重新整頁），所以筆數本身就是可靠的
    // skip 依據，不會因為分頁載入順序跟這些操作交錯而錯位。
    const loadMoreConversations = async () => {
        if (loadingMoreConversations || !hasMoreConversations) return;
        setLoadingMoreConversations(true);
        try {
            const res = await api.get<{ items: ConversationSummary[]; hasMore: boolean }>(
                "/agent/conversations", { params: { skip: conversations.length, take: CONVERSATION_PAGE_SIZE } }
            );
            setConversations(prev => [...prev, ...res.data.items]);
            setHasMoreConversations(res.data.hasMore);
        } catch (err) {
            console.error("載入更多對話紀錄失敗：", err);
        } finally {
            setLoadingMoreConversations(false);
        }
    };

    // 側欄捲到接近底部（100px 內）就先載下一頁，不用等使用者真的捲到最底才觸發，體感比較順。
    const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
            void loadMoreConversations();
        }
    };

    // 全螢幕時畫面夠寬，對話紀錄側欄預設打開；縮回浮動小視窗時 140px 的側欄太擠，預設收起來。
    // 使用者仍然可以隨時用標題列的按鈕手動開關，這裡只是切換全螢幕時重設一次「預設值」。
    useEffect(() => {
        setHistoryOpen(fullscreen);
        if (fullscreen) {
            void loadConversations();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullscreen]);

    const handleNewConversation = () => {
        setLoadTargetId(null);
        setActiveConversationId(null);
        setMirrorMessages([]);
        setConversationKey(k => k + 1);
        setHistoryOpen(fullscreen);
    };

    const handleToggleHistory = async () => {
        const next = !historyOpen;
        setHistoryOpen(next);
        if (!next) return;
        await loadConversations();
    };

    const handleLoadConversation = (conv: ConversationSummary) => {
        setLoadTargetId(conv.id);
        setActiveConversationId(conv.id);
        setConversationKey(k => k + 1);
        // 點歷史紀錄不收起側欄——使用者常常會連續點好幾則對話比對內容，
        // 每點一次就收起來、要重新展開才能點下一則，體驗很差。
    };

    const handleTogglePin = async (e: React.MouseEvent, conv: ConversationSummary) => {
        e.stopPropagation();
        setOpenMenuId(null);
        try {
            const res = await api.post<{ isPinned: boolean }>(`/agent/conversations/${conv.id}/pin`);
            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, isPinned: res.data.isPinned } : c));
        } catch (err) {
            console.error("釘選對話失敗：", err);
        }
    };

    const handleStartRename = (e: React.MouseEvent, conv: ConversationSummary) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setRenamingId(conv.id);
        setRenameValue(conv.title || "");
    };

    const handleCommitRename = async (conv: ConversationSummary) => {
        const title = renameValue.trim();
        setRenamingId(null);
        if (!title || title === (conv.title || "")) return;
        try {
            await api.put(`/agent/conversations/${conv.id}/title`, { title });
            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title } : c));
        } catch (err) {
            console.error("重新命名失敗：", err);
        }
    };

    // 選單上只留「刪除」一個動作，語意是「封存」：清單裡看不到了，但後端 /archive 只設
    // IsArchived，不會真的把那筆紀錄從資料庫清掉。刪的剛好是目前正在看的那則對話時，
    // 順便切回一個新對話，不然畫面還停在一個「清單上已經找不到」的對話上。
    const handleDeleteConversation = async (e: React.MouseEvent, conv: ConversationSummary) => {
        e.stopPropagation();
        setOpenMenuId(null);
        const ok = await confirmDialog({
            cardTitle: "刪除對話",
            message: "確定要刪除嗎？",
            confirmStyle: "bg-red-500",
        });
        if (!ok) return;
        try {
            await api.post(`/agent/conversations/${conv.id}/archive`);
            setConversations(prev => prev.filter(c => c.id !== conv.id));
            if (conv.id === activeConversationId) {
                handleNewConversation();
            }
        } catch (err) {
            console.error("刪除對話失敗：", err);
        }
    };

    // 匯出目前對話成 JSON 檔——純前端組資料下載，不用打後端（訊息內容本來就都在畫面上）。
    const handleExport = () => {
        const exportMessages = mirrorMessages
            .filter(m => m.text.trim() !== "")
            .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

        const exportData = {
            conversationId: activeConversationId,
            exportedAt: new Date().toISOString(),
            messages: exportMessages,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ai-agent-conversation-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatRelativeTime = (iso: string): string => {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
        if (diffMin < 1) return "剛剛";
        if (diffMin < 60) return `${diffMin} 分鐘前`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} 小時前`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay} 天前`;
        return date.toLocaleDateString("zh-TW");
    };

    // 已釘選的獨立一組放最上面（永遠顯示，沒有釘選的對話時顯示提示文字）；其餘依最後一則
    // 訊息時間分桶——沿用 ISHAAudit（石化）那邊對話紀錄清單的分組方式，桶內仍保留後端回傳的
    // 「最後訊息時間新到舊」排序，只是空桶不顯示。
    const buildConversationGroups = (list: ConversationSummary[]): { label: string; items: ConversationSummary[] }[] => {
        const pinned = list.filter(c => c.isPinned);
        const rest = list.filter(c => !c.isPinned);

        const DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const buckets: { label: string; items: ConversationSummary[] }[] = [
            { label: "今天", items: [] },
            { label: "過去 7 天", items: [] },
            { label: "過去 30 天", items: [] },
            { label: "更早", items: [] },
        ];
        for (const conv of rest) {
            const diffDays = (now - new Date(conv.lastMessageAt).getTime()) / DAY_MS;
            const bucket = diffDays < 1 ? buckets[0] : diffDays < 7 ? buckets[1] : diffDays < 30 ? buckets[2] : buckets[3];
            bucket.items.push(conv);
        }

        return [{ label: "已釘選", items: pinned }, ...buckets.filter(b => b.items.length > 0)];
    };

    const box = fullscreen
        ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, radius: 0 }
        : { left: currentPos.left, top: currentPos.top, width: SIZE.width, height: SIZE.height, radius: 16 };

    // 視窗本體跟裡面的 AgentChatConversation 永遠掛載（除了使用者主動按新對話/切換歷史紀錄），
    // 不透過 AnimatePresence 卸載——對話紀錄是內部的 state，卸載就會整個消失。改用
    // animate/pointer-events 純視覺地開關，這樣關閉只是「藏起來」，
    // state 保留到重新整理頁面或登出（頁面卸載）為止。
    return (
        <>
        <motion.div
            initial={false}
            animate={{
                opacity: isOpen ? 1 : 0,
                scale: isOpen ? 1 : 0.95,
                left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: box.radius,
            }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            className={`fixed bg-base-100 shadow-2xl z-[9999] flex flex-col overflow-hidden overscroll-contain border border-base-300 ${isOpen ? "" : "pointer-events-none"}`}
            role="dialog"
            aria-modal="false"
            aria-hidden={!isOpen}
            aria-label="AI 查詢助理"
            inert={!isOpen}
        >
            <div
                onMouseDown={handleDragMouseDown}
                className={`flex-shrink-0 flex items-center justify-between h-[52px] pl-3.5 pr-2 border-b border-base-300 bg-base-200 select-none ${
                    fullscreen ? "" : `cursor-move ${isDragging ? "cursor-grabbing" : ""}`
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-[30px] h-[30px] rounded-full bg-primary text-primary-content flex items-center justify-center flex-none">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-[13px] whitespace-nowrap">AI 查詢助理</div>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-base-content/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />上線中
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <button type="button" title="新對話" aria-label="新對話" onClick={handleNewConversation} className={headerIconBtnClass}>
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        title="對話紀錄"
                        aria-label="對話紀錄"
                        onClick={handleToggleHistory}
                        className={`${headerIconBtnClass} ${historyOpen ? "bg-base-300/60 text-base-content" : ""}`}
                    >
                        <HistoryIcon className="w-4 h-4" />
                    </button>
                    <button type="button" title="匯出對話" aria-label="匯出對話" onClick={handleExport} className={headerIconBtnClass} disabled={mirrorMessages.length === 0}>
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        title={fullscreen ? "縮回浮動視窗" : "全螢幕顯示"}
                        aria-label={fullscreen ? "縮回浮動視窗" : "全螢幕顯示"}
                        onClick={() => setFullscreen(f => !f)}
                        className={headerIconBtnClass}
                    >
                        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        title="關閉"
                        aria-label="關閉 AI 查詢助理"
                        onClick={close}
                        className={headerIconBtnClass}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-row">
                {historyOpen && (
                    <div
                        onScroll={handleHistoryScroll}
                        className={`${fullscreen ? "w-[260px]" : "w-[160px]"} flex-none min-h-0 border-r border-base-300 bg-base-200 overflow-y-auto p-1.5 space-y-3`}
                    >
                        {loadingConversations ? (
                            <div className="flex justify-center py-4">
                                <span className="loading loading-spinner loading-sm text-base-content/40" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center text-xs text-base-content/40 py-4 px-1">還沒有任何對話紀錄</div>
                        ) : (
                            buildConversationGroups(conversations).map(group => (
                                <div key={group.label}>
                                    <div className="px-1.5 pb-1 text-[10.5px] font-medium text-base-content/40">{group.label}</div>
                                    {group.items.length === 0 ? (
                                        <div className="px-1.5 pb-1 text-[10.5px] text-base-content/30">尚無釘選的對話</div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {group.items.map(conv => (
                                                <div
                                                    key={conv.id}
                                                    className={`group relative w-full rounded-lg hover:bg-base-300/50 transition-colors ${
                                                        conv.id === activeConversationId ? "bg-base-300/60" : ""
                                                    }`}
                                                >
                                                    {renamingId === conv.id ? (
                                                        <input
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            onBlur={() => handleCommitRename(conv)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") { e.preventDefault(); handleCommitRename(conv); }
                                                                if (e.key === "Escape") { e.preventDefault(); setRenamingId(null); }
                                                            }}
                                                            className="w-full text-xs font-medium bg-base-100 border border-primary rounded-md px-2 py-1.5 mx-0 outline-none"
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleLoadConversation(conv)}
                                                            className="w-full text-left px-2.5 py-2 pr-7"
                                                        >
                                                            <div className="text-xs font-medium truncate flex items-center gap-1">
                                                                {conv.isPinned && <Pin className="w-2.5 h-2.5 text-primary flex-none" />}
                                                                <span className="truncate">{conv.title || "（未命名對話）"}</span>
                                                            </div>
                                                            <div className="text-[10.5px] text-base-content/40">{formatRelativeTime(conv.lastMessageAt)}</div>
                                                        </button>
                                                    )}
                                                    {renamingId !== conv.id && (
                                                        <button
                                                            type="button"
                                                            title="更多操作"
                                                            aria-label="更多操作"
                                                            onClick={e => { e.stopPropagation(); setOpenMenuId(m => m === conv.id ? null : conv.id); }}
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-base-content/50 hover:bg-base-300 hover:text-base-content transition-colors"
                                                        >
                                                            <MoreVertical className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {openMenuId === conv.id && (
                                                        <div
                                                            onClick={e => e.stopPropagation()}
                                                            className="absolute right-1 top-8 z-20 w-32 rounded-lg border border-base-300 bg-base-100 shadow-lg py-1 text-xs"
                                                        >
                                                            <button onClick={e => handleStartRename(e, conv)} className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-base-200 text-left">
                                                                <Pencil className="w-3.5 h-3.5" /> 重新命名
                                                            </button>
                                                            <button onClick={e => handleTogglePin(e, conv)} className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-base-200 text-left">
                                                                {conv.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                                                {conv.isPinned ? "取消釘選" : "釘選"}
                                                            </button>
                                                            <button onClick={e => handleDeleteConversation(e, conv)} className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-base-200 text-left text-red-500">
                                                                <Trash2 className="w-3.5 h-3.5" /> 刪除
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {loadingMoreConversations && (
                            <div className="flex justify-center py-2">
                                <span className="loading loading-spinner loading-xs text-base-content/40" />
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 min-h-0 min-w-0">
                    <AgentChatConversation
                        key={conversationKey}
                        initialConversationId={loadTargetId}
                        emptyHint="輸入訊息開始查詢，或直接點下面的範例問題"
                        presetQuestions={DEFAULT_PRESET_QUESTIONS}
                        onMessagesChange={setMirrorMessages}
                        onConversationIdChange={setActiveConversationId}
                    />
                </div>
            </div>
        </motion.div>
        {ConfirmComponent}
        </>
    );
}
