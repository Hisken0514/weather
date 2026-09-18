import {JSX, ReactNode, useCallback, useMemo, useRef, useState} from "react";

// Define a proper interface for the return type
interface UseEditDialogReturn<T> {
  editDialog: (opts?: EditDialogOptions<T>) => Promise<T | null>;
  EditComponent: JSX.Element | null;
}

// Define the options interface
interface EditDialogOptions<T> {
  cardTitle?: string;
  buttonConfirm?: string;
  confirmStyle?: string;
  buttonCancel?: string;
  cancelStyle?: string;
  initialData?: T;
  renderForm?: (data: {
    initialData?: T;
    onConfirm: (data: T) => void;
    onCancel: () => void;
    onClose?: () => void;
    onHide?: () => void;  // 🆕 暫時隱藏
    onShow?: () => void;  // 🆕 重新顯示
  }) => ReactNode;
}

/**
 * useEditDialog 自訂 Hook
 * 用於顯示編輯表單對話框，並以 Promise 的方式回傳使用者填寫的資料。
 *
 * @template T 表單資料的型別，預設為 Record<string, unknown>
 * @returns {UseEditDialogReturn<T>} 回傳一個包含 editDialog 方法與 EditComponent 組件的物件
 * @returns {Function} editDialog - 顯示編輯對話框並等待使用者提交資料
 * @returns {JSX.Element | null} EditComponent - 編輯對話框的組件，用於渲染在畫面上
 */
export const useEditDialog = <T = Record<string, unknown>>(): UseEditDialogReturn<T> => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);  // 🆕 控制可見性
  const [options, setOptions] = useState<EditDialogOptions<T>>({});
  const resolveRef = useRef<((value: T | null) => void) | null>(null);

  /**
   * 觸發編輯對話框，並以 Promise 形式回傳使用者的輸入資料。
   */
  const editDialog = useCallback((opts: EditDialogOptions<T> = {}): Promise<T | null> => {
    return new Promise((resolve) => {
      setOptions({
        cardTitle: "編輯",
        buttonConfirm: "保存",
        confirmStyle: "btn-primary",
        buttonCancel: "取消",
        cancelStyle: "btn-secondary",
        ...opts
      });
      setIsOpen(true);
      setIsVisible(true);  // 🆕 重置可見性
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * 處理使用者提交表單的資料。
   */
  const handleConfirm = useCallback((data: T) => {
    setIsOpen(false);
    setIsVisible(true);  // 🆕 重置可見性
    resolveRef.current?.(data);
  }, []);

  /**
   * 處理使用者取消編輯。
   */
  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setIsVisible(true);  // 🆕 重置可見性
    resolveRef.current?.(null);
  }, []);

  /**
   * 處理關閉對話框（不返回任何數據）
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsVisible(true);  // 🆕 重置可見性
    resolveRef.current?.(null);
  }, []);

  /**
   * 🆕 暫時隱藏對話框（不關閉，不解析 Promise）
   */
  const handleHide = useCallback(() => {
    console.log('隱藏編輯對話框');
    setIsVisible(false);
  }, []);

  /**
   * 🆕 重新顯示對話框
   */
  const handleShow = useCallback(() => {
    console.log('顯示編輯對話框');
    setIsVisible(true);
  }, []);

  /**
   * 回傳用於渲染編輯表單對話框的組件。
   */
  const EditComponent = useMemo(() => {
    // 🆕 只有在打開且可見時才渲染
    if (!isOpen || !isVisible) return null;

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="card bg-base-100 border border-gray-200 shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
          <div className="card-body p-6">
            <h2 className="text-xl font-semibold mb-4 text-base-content">{options.cardTitle}</h2>

            {/* 🆕 傳入所有回調函數，包括 onHide 和 onShow */}
            {options.renderForm?.({
              initialData: options.initialData,
              onConfirm: handleConfirm,
              onCancel: handleCancel,
              onClose: handleClose,
              onHide: handleHide,   // 🆕 暫時隱藏函數
              onShow: handleShow    // 🆕 重新顯示函數
            })}
          </div>
        </div>
      </div>
    );
  }, [isOpen, isVisible, options, handleConfirm, handleCancel, handleClose, handleHide, handleShow]);

  return { editDialog, EditComponent };
};
