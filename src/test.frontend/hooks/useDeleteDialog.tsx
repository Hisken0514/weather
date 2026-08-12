import React, { useState } from "react";

interface UseDeleteModalOptions<T> {
    onDelete: (item: T) => Promise<void>;
    onSuccess?: () => void;
    // 選擇性傳入標題或內容渲染邏輯
    title?: string;
    getItemLabel?: (item: T) => string;
}

export function useDeleteModal<T>({
                                      onDelete,
                                      onSuccess,
                                      title = "確認刪除提示",
                                      getItemLabel,
                                  }: UseDeleteModalOptions<T>) {
    const [selectedItem, setSelectedItem] = useState<T | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const openDeleteModal = (item: T) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedItem) return;

        try {
            setIsDeleting(true);
            await onDelete(selectedItem);
            closeDeleteModal();

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error("刪除操作失敗:", err);
            alert("刪除失敗，請再試一次");
        } finally {
            setIsDeleting(false);
        }
    };

    // --- 在 Hook 內定義直接回傳的 JSX 元件 ---
    const DeleteModal = () => (
        <div className={`modal ${isModalOpen ? "modal-open" : ""}`} role="dialog">
            <div className="modal-box">
                <h3 className="text-lg font-bold text-error">{title}</h3>
                <p className="py-4">
                    確定要刪除{" "}
                    <span className="font-semibold underline">
                        {selectedItem
                            ? getItemLabel
                                ? getItemLabel(selectedItem)
                                : String((selectedItem as Record<string, unknown>).date ?? "")
                            : ""}
                    </span>{" "}
                    的資料嗎？此動作無法復原。
                </p>
                <div className="modal-action">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={closeDeleteModal}
                        disabled={isDeleting}
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        className="btn btn-error"
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            "確認刪除"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return {
        selectedItem,
        isModalOpen,
        isDeleting,
        openDeleteModal,
        closeDeleteModal,
        handleConfirmDelete,
        DeleteModal,
    };
}