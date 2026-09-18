import React from "react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
                                          isOpen,
                                          title = "確認操作",
                                          message,
                                          onConfirm,
                                          onCancel,
                                      }: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <p className="mb-6">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-outline"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="btn btn-primary"
                    >
                        確認送出
                    </button>
                </div>
            </div>
        </div>
    );
}