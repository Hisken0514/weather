import {JSX, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";

/**
 * 確認對話框的選項設定。
 */
interface ConfirmDialogOptions {
  cardTitle?: string;
  message?: string;
  buttonConfirm?: string;
  confirmStyle?: string;
  buttonCancel?: string;
  cancelStyle?: string;
  modalClassName?: string;
  backdropClassName?: string;
  zIndex?: number;
  escapeToClose?: boolean;
  // 🆕 無障礙性選項
  ariaLabel?: string; // 自定義 aria-label
  ariaDescribedBy?: string; // 額外的 aria-describedby ID
  confirmButtonAriaLabel?: string; // 確認按鈕的 aria-label
  cancelButtonAriaLabel?: string; // 取消按鈕的 aria-label
}

/**
 * useConfirm hook 的回傳型別定義。
 */
interface UseConfirmReturn {
  confirmDialog: (opts?: ConfirmDialogOptions) => Promise<boolean>;
  ConfirmComponent: JSX.Element | null;
}

/**
 * useConfirm 自訂 Hook
 * 用於顯示確認對話框，並以 Promise 的方式回傳使用者的選擇。
 * 支援完整的鍵盤控制和無障礙性功能。
 */
export const useConfirm = (): UseConfirmReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({});
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 🆕 生成唯一 ID 供 ARIA 標籤使用
  const dialogId = useRef(`confirm-dialog-${Math.random().toString(36).substr(2, 9)}`);
  const titleId = useRef(`${dialogId.current}-title`);
  const messageId = useRef(`${dialogId.current}-message`);

  /**
   * 觸發確認對話框，並以 Promise 形式回傳使用者的選擇。
   */
  const confirmDialog = useCallback((opts: ConfirmDialogOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({
        cardTitle: "確認",
        message: "確定要執行此操作嗎？",
        escapeToClose: true,
        buttonConfirm: "確認",
        buttonCancel: "取消",
        ...opts
      });
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * 關閉對話框的通用方法
   */
  const closeDialog = useCallback((result: boolean) => {
    setIsVisible(false);
    // 等待動畫完成後再移除元件
    setTimeout(() => {
      setIsOpen(false);
      resolveRef.current?.(result);
    }, 200);
  }, []);

  /**
   * 處理使用者確認操作。
   */
  const handleConfirm = useCallback(() => {
    closeDialog(true);
  }, [closeDialog]);

  /**
   * 處理使用者取消操作。
   */
  const handleCancel = useCallback(() => {
    closeDialog(false);
  }, [closeDialog]);

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
   * 設定初始焦點
   */
  const setInitialFocus = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // 對於確認對話框，優先聚焦取消按鈕（更安全），如果沒有則聚焦第一個按鈕
      const cancelButton = focusableElements.find(el =>
        el.textContent?.includes(options.buttonCancel || "取消")
      );
      const targetElement = cancelButton || focusableElements[0];
      targetElement.focus();
    }
  }, [getFocusableElements, options.buttonCancel]);

  /**
   * 處理動畫效果的 useEffect
   */
  useEffect(() => {
    if (isOpen) {
      // 立即顯示背景，然後觸發動畫
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  /**
   * 處理背景點擊事件
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeDialog(false);
    }
  }, [closeDialog]);

  /**
   * 處理鍵盤事件（ESC 鍵關閉對話框 + Tab 鍵循環）
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !isVisible) return;

      switch (e.key) {
        case 'Escape':
          if (options.escapeToClose !== false) {
            e.preventDefault();
            closeDialog(false);
          }
          break;
        case 'Tab':
          handleTabKey(e);
          break;
        // 🆕 添加 Enter 鍵快捷操作
        case 'Enter':
          if (e.target instanceof HTMLButtonElement) {
            // 如果焦點在按鈕上，讓按鈕處理 Enter
            return;
          }
          // 否則觸發確認操作
          e.preventDefault();
          handleConfirm();
          break;
      }
    };

    if (isOpen) {
      // 記錄當前焦點元素
      previousFocusRef.current = document.activeElement as HTMLElement;

      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';

      // 🆕 添加 aria-hidden 到其他元素，提升螢幕閱讀器體驗
      const mainContent = document.querySelector('main, #root, #app, body > div:first-child');
      if (mainContent) {
        mainContent.setAttribute('aria-hidden', 'true');
      }

      // 延遲設定初始焦點，確保 DOM 已渲染和動畫開始
      const timeoutId = setTimeout(() => {
        if (isVisible) {
          setInitialFocus();
        }
      }, 150);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';

      // 🆕 移除 aria-hidden
      const mainContent = document.querySelector('main, #root, #app, body > div:first-child');
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden');
      }

      // 對話框關閉時，恢復之前的焦點
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isOpen, isVisible, closeDialog, handleTabKey, setInitialFocus, options.escapeToClose, handleConfirm]);

  /**
   * 回傳用於渲染確認對話框的組件。
   */
  const ConfirmComponent = useMemo(() => {
    if (!isOpen) return null;

    const hasConfirmButton = options.buttonConfirm !== undefined;
    const hasCancelButton = options.buttonCancel !== undefined;

    // 動態構建樣式
    const backdropClasses = [
      'fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200',
      options.backdropClassName || '',
      isVisible ? 'opacity-100' : 'opacity-0'
    ].join(' ');

    const modalClasses = [
      'card bg-base-100 border border-gray-200 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200',
      options.modalClassName || '',
      isVisible
        ? 'translate-y-0 opacity-100 scale-100'
        : 'translate-y-8 opacity-0 scale-95'
    ].join(' ');

    // 動態設置 z-index
    const backdropStyle = options.zIndex ? { zIndex: options.zIndex } : { zIndex: 9999 };

    // 🆕 構建 ARIA 屬性
    const ariaLabelledBy = options.cardTitle ? titleId.current : undefined;
    const ariaDescribedBy = [
      options.message ? messageId.current : '',
      options.ariaDescribedBy || ''
    ].filter(Boolean).join(' ') || undefined;

    const dialogContent = (
      <div
        className={backdropClasses}
        style={backdropStyle}
        onClick={handleBackdropClick}
        // 🆕 完整的無障礙屬性
        role="dialog"
        aria-modal="true"
        aria-label={options.ariaLabel || (options.cardTitle ? undefined : "確認對話框")}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-live="polite" // 🆕 當對話框內容變化時通知螢幕閱讀器
      >
        <div
          ref={dialogRef}
          className={modalClasses}
          onClick={(e) => e.stopPropagation()}
          // 🆕 提供更好的語義化標記
          role="document"
        >
          <div className="card-body p-6">
            {/* 標題 */}
            {options.cardTitle && (
              <h2
                id={titleId.current}
                className="text-xl font-semibold mb-4 text-base-content"
                // 🆕 標題的 ARIA 屬性
                role="heading"
                aria-level={1}
              >
                {options.cardTitle}
              </h2>
            )}

            {/* 訊息內容 */}
            {options.message && (
              <div
                id={messageId.current}
                className="text-base-content mb-6"
                // 🆕 內容區域的 ARIA 屬性
                role="region"
                aria-label="對話框內容"
              >
                {options.message.split('\n').map((line, index, array) => (
                  <span key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </span>
                ))}
              </div>
            )}

            {/* 按鈕區域 */}
            {(hasConfirmButton || hasCancelButton) && (
              <div
                className="flex gap-3 justify-end"
                // 🆕 按鈕群組的 ARIA 屬性
                role="group"
                aria-label="對話框操作按鈕"
              >
                {hasCancelButton && (
                  <button
                    onClick={handleCancel}
                    className={`btn px-6 py-2 rounded-md hover:opacity-80 transform hover:scale-105 active:scale-95 ${
                      options.cancelStyle || 'bg-secondary text-secondary-content'
                    }`}
                    // 🆕 取消按鈕的無障礙屬性
                    type="button"
                    aria-label={options.cancelButtonAriaLabel || `取消操作：${options.cardTitle || '確認對話框'}`}
                    aria-describedby={options.message ? messageId.current : undefined}
                  >
                    {options.buttonCancel}
                  </button>
                )}

                {hasConfirmButton && (
                  <button
                    onClick={handleConfirm}
                    className={`px-6 py-2 text-white rounded-md hover:opacity-80 transform hover:scale-105 active:scale-95 ${
                      options.confirmStyle || 'bg-primary'
                    }`}
                    // 🆕 確認按鈕的無障礙屬性
                    type="button"
                    aria-label={options.confirmButtonAriaLabel || `確認操作：${options.cardTitle || '確認對話框'}`}
                    aria-describedby={options.message ? messageId.current : undefined}
                    autoFocus={false} // 避免自動聚焦到危險操作按鈕
                  >
                    {options.buttonConfirm}
                  </button>
                )}
              </div>
            )}

            {/* 🆕 隱藏的說明文字供螢幕閱讀器使用 */}
            <div className="sr-only" aria-live="polite">
              對話框已開啟。使用 Tab 鍵在按鈕間移動，Enter 鍵確認選擇，Escape 鍵關閉對話框。
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(dialogContent, document.body);
  }, [isOpen, isVisible, options, handleConfirm, handleCancel, handleBackdropClick, titleId, messageId]);

  return { confirmDialog, ConfirmComponent };
};
