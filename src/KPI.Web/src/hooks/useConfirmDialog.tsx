'use client'

import React, {
    useState,
    useCallback,
    createContext,
    useContext,
    useEffect,
    useRef,
} from "react";

type ConfirmOptions = {
    message: string;
    title?: string;
    showCancel?: boolean;
};

type ConfirmDialogContextType = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirmDialog = (): ConfirmDialogContextType => {
    const context = useContext(ConfirmDialogContext);
    if (!context) throw new Error("useConfirmDialog 必須包在 ConfirmDialogProvider 中");
    return context;
};

export const ConfirmDialogProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
    const [resolveFn, setResolveFn] = useState<(result: boolean) => void>();

    // --- A11y / Focus 管理 ---
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelBtnRef = useRef<HTMLButtonElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    const lastActiveRef = useRef<HTMLElement | null>(null);

    const titleId = "confirm-dialog-title";
    const descId = "confirm-dialog-desc";

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        // 記錄開啟前的焦點，關閉後還原
        lastActiveRef.current = (document.activeElement as HTMLElement) ?? null;

        setOptions({ showCancel: true, ...opts });
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            setResolveFn(() => resolve);
        });
    }, []);

    const closeAndResolve = useCallback((val: boolean) => {
        setIsOpen(false);
        resolveFn?.(val);
    }, [resolveFn]);

    const handleConfirm = useCallback(() => closeAndResolve(true), [closeAndResolve]);
    const handleCancel  = useCallback(() => closeAndResolve(false), [closeAndResolve]);

    // 開啟時：鎖背景捲動 + 把焦點移到對話框內第一顆可操作按鈕
    useEffect(() => {
        if (!isOpen) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const t = setTimeout(() => {
            // 預設讓「取消」優先取得焦點（若有顯示）；否則讓「確認」取得焦點
            if (options.showCancel && cancelBtnRef.current) {
                cancelBtnRef.current.focus();
            } else if (confirmBtnRef.current) {
                confirmBtnRef.current.focus();
            } else {
                dialogRef.current?.focus(); // 最後手段
            }
        }, 0);

        return () => {
            document.body.style.overflow = prevOverflow;
            clearTimeout(t);
            // 關閉時把焦點還給觸發按鈕（或先前聚焦的元素）
            if (lastActiveRef.current) {
                setTimeout(() => lastActiveRef.current?.focus(), 0);
            }
        };
    }, [isOpen, options.showCancel]);

    // Focus trap + Esc 關閉
    useEffect(() => {
        if (!isOpen) return;

        const isFocusable = (el: HTMLElement) => {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            if ((el as HTMLButtonElement).disabled) return false;
            if (el.getAttribute("aria-hidden") === "true") return false;
            return true;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            // Esc 關閉（預設走「取消」邏輯）
            if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
                return;
            }
            if (e.key !== "Tab") return;

            const container = dialogRef.current;
            if (!container) return;

            const nodes = Array.from(
                container.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter(isFocusable);

            if (nodes.length === 0) return;

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
    }, [isOpen, handleCancel]);

    // 點遮罩關閉（等同取消）
    const onBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}

            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/40 z-[1000]"
                    onMouseDown={onBackdropMouseDown}
                >
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={descId}
                        // 讓容器在必要時可被聚焦（作為保底）
                        tabIndex={-1}
                        className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col outline-none"
                    >
                        {/* 標題區 */}
                        <div className="px-6 pt-6 pb-2 border-b">
                            <h3 id={titleId} className="text-lg font-semibold">
                                {options.title || "確認操作"}
                            </h3>
                        </div>

                        {/* 內容區（可捲動） */}
                        <div
                            id={descId}
                            className="px-6 py-4 overflow-y-auto text-sm text-gray-800 whitespace-pre-wrap"
                            style={{ flexGrow: 1 }}
                        >
                            {options.message}
                        </div>

                        {/* 按鈕列（固定底部） */}
                        <div className="px-6 pb-4 pt-2 border-t flex justify-end gap-2 flex-shrink-0">
                            {options.showCancel && (
                                <button
                                    ref={cancelBtnRef}
                                    className="btn btn-outline"
                                    onClick={handleCancel}
                                >
                                    取消
                                </button>
                            )}
                            <button
                                ref={confirmBtnRef}
                                className="btn btn-primary"
                                onClick={handleConfirm}
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
};