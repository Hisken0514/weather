import {JSX, ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";

// Define a proper interface for the return type
interface UseEditDialogReturn<T> {
  editDialog: (opts?: EditDialogOptions<T>) => Promise<T | null>;
  EditComponent: JSX.Element | null;
}

// Define the options interface
interface EditDialogOptions<T> {
  cardStyle?: string;
  cardTitle?: string;
  buttonConfirm?: string;
  confirmStyle?: string;
  buttonCancel?: string;
  cancelStyle?: string;
  initialData?: T;
  escapeToClose?: boolean;
  // 無障礙性選項
  ariaLabel?: string; // 自定義 aria-label
  ariaDescribedBy?: string; // 額外的 aria-describedby ID
  formAriaLabel?: string; // 表單區域的 aria-label
  modalClassName?: string; // 自定義模態框樣式
  backdropClassName?: string; // 自定義背景樣式
  zIndex?: number; // 自定義 z-index
  renderForm?: (data: {
    initialData?: T;
    onConfirm: (data: T) => void;
    onCancel: () => void;
    onClose?: () => void;
    onHide?: () => void;
    onShow?: () => void;
    // 無障礙性相關的回調
    dialogId?: string; // 對話框 ID
    titleId?: string; // 標題 ID
    formId?: string; // 表單 ID
  }) => ReactNode;
}

/**
 * useEditDialog 自訂 Hook
 * 用於顯示編輯表單對話框，並以 Promise 的方式回傳使用者填寫的資料。
 * 支援完整的鍵盤控制和無障礙性功能。
 *
 * @template T 表單資料的型別，預設為 Record<string, unknown>
 * @returns {UseEditDialogReturn<T>} 回傳一個包含 editDialog 方法與 EditComponent 組件的物件
 */
export const useEditDialog = <T = Record<string, unknown>>(): UseEditDialogReturn<T> => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [options, setOptions] = useState<EditDialogOptions<T>>({});
  const resolveRef = useRef<((value: T | null) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 生成唯一 ID 供 ARIA 標籤使用
  const dialogId = useRef(`edit-dialog-${Math.random().toString(36).substr(2, 9)}`);
  const titleId = useRef(`${dialogId.current}-title`);
  const formId = useRef(`${dialogId.current}-form`);

  /**
   * 獲取對話框內所有可聚焦的元素
   */
  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(dialogRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  /**
   * 處理 Tab 鍵循環聚焦
   */
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab：向前循環
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab：向後循環
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [getFocusableElements]);

  /**
   * 觸發編輯對話框，並以 Promise 形式回傳使用者的輸入資料。
   */
  const editDialog = useCallback((opts: EditDialogOptions<T> = {}): Promise<T | null> => {
    return new Promise((resolve) => {
      setOptions({
        buttonConfirm: "保存",
        confirmStyle: "btn-primary",
        buttonCancel: "取消",
        cancelStyle: "btn-secondary",
        escapeToClose: true,
        cardTitle: "編輯資料", // 預設標題
        ...opts
      });
      setIsOpen(true);
      setIsVisible(true);
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * 處理使用者提交表單的資料。
   */
  const handleConfirm = useCallback((data: T) => {
    setIsOpen(false);
    setIsVisible(true);
    resolveRef.current?.(data);
  }, []);

  /**
   * 處理使用者取消編輯。
   */
  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setIsVisible(true);
    resolveRef.current?.(null);
  }, []);

  /**
   * 處理關閉對話框（不返回任何數據）
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsVisible(true);
    resolveRef.current?.(null);
  }, []);

  /**
   * 鍵盤事件處理
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || !isVisible) return;

    switch (event.key) {
      case 'Escape':
        if (options.escapeToClose !== false) {
          event.preventDefault();
          handleCancel();
        }
        break;
      case 'Tab':
        handleTabKey(event);
        break;
    }
  }, [isOpen, isVisible, options.escapeToClose, handleCancel, handleTabKey]);

  /**
   * 設定初始焦點
   */
  const setInitialFocus = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // 優先聚焦第一個 input 或 textarea，否則聚焦第一個可聚焦元素
      const inputElement = focusableElements.find(el =>
        el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
      );
      const targetElement = inputElement || focusableElements[0];
      targetElement.focus();
    }
  }, [getFocusableElements]);

  /**
   * 管理焦點和鍵盤事件監聽器
   */
  useEffect(() => {
    if (isOpen && isVisible) {
      // 記錄當前焦點元素
      previousFocusRef.current = document.activeElement as HTMLElement;

      // 添加鍵盤事件監聽器
      document.addEventListener('keydown', handleKeyDown);

      // 防止背景滾動
      document.body.style.overflow = 'hidden';

      // 添加 aria-hidden 到其他元素
      const mainContent = document.querySelector('main, #root, #app, body > div:first-child');
      if (mainContent) {
        mainContent.setAttribute('aria-hidden', 'true');
      }

      // 延遲設定初始焦點，確保 DOM 已渲染
      const timeoutId = setTimeout(setInitialFocus, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else if (!isOpen) {
      // 對話框關閉時的清理工作
      document.body.style.overflow = 'unset';

      // 移除 aria-hidden
      const mainContent = document.querySelector('main, #root, #app, body > div:first-child');
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden');
      }

      // 恢復之前的焦點
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen, isVisible, handleKeyDown, setInitialFocus]);

  /**
   * 暫時隱藏對話框（不關閉，不解析 Promise）
   */
  const handleHide = useCallback(() => {
    console.log('隱藏編輯對話框');
    setIsVisible(false);
  }, []);

  /**
   * 重新顯示對話框
   */
  const handleShow = useCallback(() => {
    console.log('顯示編輯對話框');
    setIsVisible(true);
  }, []);

  /**
   * 處理背景點擊
   */
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  /**
   * 回傳用於渲染編輯表單對話框的組件。
   */
  const EditComponent = useMemo(() => {
    if (!isOpen || !isVisible) return null;

    // 動態構建樣式
    const backdropClasses = [
      'fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200',
      options.backdropClassName || ''
    ].join(' ');

    const modalClasses = [
      options.cardStyle || "card bg-base-100 border border-gray-200 shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto",
      options.modalClassName || ''
    ].join(' ');

    // 動態設置 z-index
    const backdropStyle = options.zIndex ? { zIndex: options.zIndex } : { zIndex: 50 };

    // 構建 ARIA 屬性
    const ariaLabelledBy = options.cardTitle ? titleId.current : undefined;
    const ariaDescribedBy = [
      formId.current,
      options.ariaDescribedBy || ''
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div
        className={backdropClasses}
        style={backdropStyle}
        onClick={handleBackdropClick}
        // 完整的無障礙屬性
        role="dialog"
        aria-modal="true"
        aria-label={options.ariaLabel || (options.cardTitle ? undefined : "編輯對話框")}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-live="polite"
      >
        <div
          ref={dialogRef}
          className={modalClasses}
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <div className="card-body p-6">
            {/* 標題 */}
            {options.cardTitle && (
              <h2
                id={titleId.current}
                className="text-xl font-semibold mb-4 text-base-content"
                role="heading"
                aria-level={1}
              >
                {options.cardTitle}
              </h2>
            )}

            {/* 表單區域 */}
            <div
              id={formId.current}
              role="region"
              aria-label={options.formAriaLabel || "編輯表單"}
              className="mb-4"
            >
              {options.renderForm?.({
                initialData: options.initialData,
                onConfirm: handleConfirm,
                onCancel: handleCancel,
                onClose: handleClose,
                onHide: handleHide,
                onShow: handleShow,
                // 提供 ID 給表單使用
                dialogId: dialogId.current,
                titleId: titleId.current,
                formId: formId.current
              })}
            </div>

            {/* 隱藏的操作說明 */}
            <div className="sr-only" aria-live="polite">
              編輯對話框已開啟。使用 Tab 鍵在表單欄位間移動，填寫完成後可使用按鈕儲存或取消，按 Escape 鍵關閉對話框。
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    isOpen,
    isVisible,
    options,
    handleConfirm,
    handleCancel,
    handleClose,
    handleHide,
    handleShow,
    handleBackdropClick,
    titleId,
    formId,
    dialogId
  ]);

  return { editDialog, EditComponent };
};
