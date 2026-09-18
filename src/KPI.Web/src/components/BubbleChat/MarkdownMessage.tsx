'use client'
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, FileText } from 'lucide-react';

interface MarkdownMessageProps {
    message: string;
    className?: string;
}

/** 判斷一個連結是不是「檔案下載」——網址結尾像常見文件副檔名時，渲染成檔案卡而不是純文字連結。 */
const FILE_EXTENSION_RE = /\.(xlsx|xls|csv|docx|doc|pdf|pptx|json|zip)(\?.*)?$/i;

// 檔案 chip（圖示+檔名）+ 另一顆 outline 的下載鈕分開兩層——不是整段都是連結，檔名本身
// 只是標示這是什麼檔案，下載動作要按明確的按鈕。這段是嵌在 assistant 回覆的泡泡「裡面」，
// 不另外疊一層泡泡背景，只用比外層泡泡再深一點的底色區隔。
const FileDownloadCard: React.FC<{ href: string; label: string }> = ({ href, label }) => (
    <div className="not-prose my-1.5 max-w-full rounded-lg bg-base-content/5 px-2.5 py-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{label}</span>
        </div>
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-2.5 py-1 text-[11px] font-medium hover:bg-base-200 transition-colors"
        >
            <Download className="w-3 h-3" />
            下載
        </a>
    </div>
);

/**
 * 共用的 AI 回覆 Markdown 渲染元件（標題、表格、程式碼區塊、清單等），
 * 從 ChatBubble 抽出來，讓 AgentChatConversation、AgentChatTestView 共用同一份樣式。
 */
const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message, className }) => {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const copyToClipboard = async (code: string, codeId: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(codeId);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('複製失敗:', err);
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedCode(codeId);
            setTimeout(() => setCopiedCode(null), 2000);
        }
    };

    const markdownComponents: Components = {
        // 段落
        p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
        ),

        // 強調文字
        strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
        ),

        // 斜體
        em: ({ children }) => (
            <em className="italic">{children}</em>
        ),

        // 代碼區塊——統一一種深色樣式（不再依語言換底色），小標籤 + hover 才出現的複製按鈕，
        // 比逐語言換色的終端機風格乾淨、跟訊息泡泡本身的顏色語言（藍/灰）不衝突。
        code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isCodeBlock = match;
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            // LLM 偶爾會吐出空的或只有空白的 code fence（格式小失誤），不要畫出一個空白大方塊，
            // 沒有內容就不渲染，讓文字自然接續。
            if (isCodeBlock && !codeContent.trim()) {
                return null;
            }

            if (isCodeBlock) {
                const codeId = `code-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
                const isCopied = copiedCode === codeId;

                return (
                    <div className="not-prose my-2 w-full overflow-hidden rounded-xl bg-neutral text-neutral-content">
                        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wide opacity-60">
                            <span>{language || 'code'}</span>
                            <button
                                onClick={() => copyToClipboard(codeContent, codeId)}
                                className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-neutral-content/10 transition-colors normal-case"
                                title={isCopied ? '已複製！' : '複製代碼'}
                            >
                                {isCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                {isCopied ? '已複製' : '複製'}
                            </button>
                        </div>
                        <pre className="overflow-x-auto px-3 pb-3 text-xs leading-relaxed">
                            <code>{codeContent}</code>
                        </pre>
                    </div>
                );
            }

            // 行內代碼——內容較長時在窄寬度下會換行，box-decoration-break: clone 讓每一行斷行
            // 都各自套用完整的圓角/padding，視覺上才連貫；break-words 避免超長字串撐爆泡泡寬度。
            return (
                <code className="rounded bg-base-300/70 px-1 py-0.5 text-xs font-mono break-words [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                    {children}
                </code>
            );
        },

        // 列表
        ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-2">{children}</ul>
        ),

        ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-2">{children}</ol>
        ),

        li: ({ children }) => (
            <li className="text-sm leading-relaxed">{children}</li>
        ),

        // 連結——檔案下載連結（依副檔名判斷）渲染成檔案卡，其餘照常是普通連結。
        a: ({ href, children }) => {
            const text = typeof children === 'string' ? children : String(children ?? '');
            if (href && FILE_EXTENSION_RE.test(href)) {
                return <FileDownloadCard href={href} label={text || href.split('/').pop() || '下載檔案'} />;
            }
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary-focus break-all"
                >
                    {children}
                </a>
            );
        },

        // 標題
        h1: ({ children }) => (
            <h1 className="text-base font-bold my-2 border-b border-base-300 pb-1">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-sm font-bold my-2">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-sm font-semibold my-1">{children}</h3>
        ),

        // 引用
        blockquote: ({ children }) => (
            <div className="not-prose my-2 border-l-2 border-primary/40 bg-base-200/60 rounded-r-lg px-3 py-2 text-sm">
                {children}
            </div>
        ),

        // 表格
        table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-base-300">
                <table className="table table-sm w-full text-xs">{children}</table>
            </div>
        ),

        thead: ({ children }) => (
            <thead className="bg-base-200">{children}</thead>
        ),

        tbody: ({ children }) => (
            <tbody>{children}</tbody>
        ),

        tr: ({ children }) => (
            <tr className="hover:bg-base-200/40">{children}</tr>
        ),

        th: ({ children }) => (
            <th className="text-xs font-medium p-2 text-left border-b border-base-300">{children}</th>
        ),

        td: ({ children }) => (
            <td className="text-xs p-2 border-b border-base-200 align-top">{children}</td>
        ),

        // 水平線
        hr: () => (
            <hr className="border-base-300 my-3" />
        ),
    };

    return (
        <div className={className ?? "markdown-content prose prose-sm max-w-none"}>
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {message}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownMessage;
