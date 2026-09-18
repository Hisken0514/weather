'use client';
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export interface UploadItem {
    title: string;
    content: string;
    href: string;
    icon?: React.ReactNode;
}

interface UploadOptionModalProps {
    isOpen: boolean;
    activeIndex: number | null;
    toggle: (index: number) => void;
    closeModal: () => void;
    title?: string;
    description?: string;
    items: UploadItem[];
    /** 可選：傳入觸發按鈕的 ref，關閉時會把焦點還回去 */
    triggerRef?: React.RefObject<HTMLElement>;
}

export function UploadOptionModal({
                                      isOpen,
                                      activeIndex,
                                      toggle,
                                      closeModal,
                                      title = "請選擇上傳方式",
                                      description = "系統提供以下幾種方式供您使用",
                                      items,
                                      triggerRef
                                  }: UploadOptionModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const firstActionRef = useRef<HTMLButtonElement>(null);

    const titleId = "upload-option-dialog-title";
    const descId = "upload-option-dialog-desc";

    // 開啟時：鎖背景捲動 + 聚焦
    useEffect(() => {
        if (!isOpen) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const t = setTimeout(() => {
            // 讓對話框或第一個項目的按鈕取焦
            if (firstActionRef.current) {
                firstActionRef.current.focus();
            } else {
                dialogRef.current?.focus();
            }
        }, 0);

        return () => {
            document.body.style.overflow = prevOverflow;
            clearTimeout(t);
            // 關閉時把焦點還給觸發按鈕（若有）
            if (triggerRef?.current) {
                setTimeout(() => triggerRef.current?.focus(), 0);
            }
        };
    }, [isOpen, triggerRef]);

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
            // Esc 關閉
            if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
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
    }, [isOpen, closeModal]);

    // 點遮罩關閉
    const onBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal modal-open z-50"
            onMouseDown={onBackdropMouseDown}
            aria-hidden={!isOpen}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                tabIndex={-1}
                className="modal-box bg-white p-6 rounded-2xl shadow-lg border w-full max-w-2xl outline-none"
            >
                {/* 標題 / 說明（提供 aria 對應） */}
                <h3 id={titleId} className="text-2xl font-bold text-gray-800 mb-2">
                    {title}
                </h3>
                <p id={descId} className="text-sm text-gray-500 mb-4">
                    {description}
                </p>

                {/* 列表 */}
                <div className="grid gap-4">
                    {items.map((item, idx) => {
                        const expanded = activeIndex === idx;
                        return (
                            <div
                                key={idx}
                                className="border border-base-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition"
                            >
                                <button
                                    ref={idx === 0 ? firstActionRef : undefined}
                                    onClick={() => toggle(idx)}
                                    aria-expanded={expanded}
                                    aria-controls={`upload-item-panel-${idx}`}
                                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800"
                                >
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        {item.title}
                                    </div>
                                    <span className="text-gray-400" aria-hidden="true">
                    {expanded ? "▲" : "▼"}
                  </span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {expanded && (
                                        <motion.div
                                            key="content"
                                            id={`upload-item-panel-${idx}`}
                                            role="region"
                                            aria-label={`${item.title} 詳細內容`}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                            className="overflow-hidden px-4 pb-4 text-sm text-gray-600"
                                        >
                                            <p>{item.content}</p>
                                            <div className="flex justify-end mt-3 mb-3">
                                                <Link
                                                    href={item.href}
                                                    className="btn btn-sm btn-primary"
                                                    onClick={closeModal}
                                                >
                                                    前往
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                <div className="modal-action mt-6 flex justify-end">
                    <button
                        type="button"
                        className="btn btn-neutral btn-sm"
                        onClick={closeModal}
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
}