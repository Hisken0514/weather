import React, {ReactNode, useState, useEffect, useRef} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrawerProps {
  /** 抽屜內容 */
  children: ReactNode;
  /** 整體容器樣式類名 */
  className?: string;
  /** 觸發按鈕樣式類名 */
  triggerClassName?: string;
  /** 背景遮罩樣式類名 */
  overlayClassName?: string;
  /** 抽屜主體樣式類名 */
  drawerClassName?: string;
  /** 自定義觸發按鈕內容 */
  triggerContent?: ReactNode;
  /** 點擊背景遮罩是否關閉抽屜 */
  closeOnOverlayClick?: boolean;
  /** 抽屜最大高度 */
  maxHeight?: string;
  maxWidth?: string;
  /** 是否自動隱藏按鈕 */
  autoHide?: boolean;
  /** 自動隱藏延遲時間 (毫秒) */
  autoHideDelay?: number;
  /** 按鈕位置 */
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** 距離感測範圍 (像素) */
  detectionDistance?: number;
}

const Drawer = ({
  children,
  className = "",
  triggerClassName = "",
  overlayClassName = "",
  drawerClassName = "",
  triggerContent,
  closeOnOverlayClick = true,
  maxHeight = "80vh",
  maxWidth = "100vw",
  autoHide = true,
  autoHideDelay = 3000,
  position = 'center-center',
  detectionDistance = 150
}: DrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isNear, setIsNear] = useState(false);
  const [mouseDistance, setMouseDistance] = useState(999);
  const buttonRef = useRef<HTMLDivElement>(null);

  // 距離感測邏輯
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;

      const distance = Math.sqrt(
        Math.pow(e.clientX - buttonCenterX, 2) +
        Math.pow(e.clientY - buttonCenterY, 2)
      );

      setMouseDistance(Math.round(distance));
      const isWithinRange = distance <= detectionDistance;
      setIsNear(isWithinRange);

      // 在感測範圍內時，顯示按鈕
      if (isWithinRange) {
        setIsVisible(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [detectionDistance]);

  // 自動隱藏邏輯 - 只有在不靠近且未開啟時才隱藏
  useEffect(() => {
    if (!autoHide || isNear || isOpen) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [autoHide, autoHideDelay, isNear, isOpen]);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      closeDrawer();
    }
  };

  // 獲取按鈕位置樣式
  const getPositionClasses = () => {
    const positions = {
      'top-left': 'fixed top-18 left-4',
      'top-center': 'fixed top-18 left-1/2 transform -translate-x-1/2',
      'top-right': 'fixed top-18 right-4',
      'center-left': 'fixed top-1/2 left-4 transform -translate-y-1/2',
      'center-center': 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      'center-right': 'fixed top-1/2 right-4 transform -translate-y-1/2',
      'bottom-left': 'fixed bottom-4 left-4',
      'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
      'bottom-right': 'fixed bottom-4 right-4'
    };
    return positions[position] || positions['center-center'];
  };

  return (
    <>
      {/* 隱形感測區域 - 永遠存在 */}
      <div
        ref={buttonRef}
        className={`
          ${getPositionClasses()}
          z-[99] pointer-events-none
          w-20 h-12 // 固定大小的感測區域
        `}
      />

      {/* 觸發按鈕區域 */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className={`
              ${getPositionClasses()}
              z-[100] select-none
              ${triggerClassName}
            `}
            onClick={toggleDrawer}
          >
            {triggerContent || (
              <button
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg
                  ${isNear 
                    ? 'bg-red-500 text-white scale-110 shadow-xl' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }
                `}
              >
                測試按鈕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 抽屜覆蓋層和內容 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`
                fixed inset-0 bg-black/50 z-[9998]
                ${overlayClassName}
              `}
              onClick={handleOverlayClick}
            />

            {/* 抽屜主體 */}
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{
                type: "tween",
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className={`
                fixed top-0 z-[9999] 
                ${maxWidth !== "100vw" ? "left-1/2 transform -translate-x-1/2" : "left-0 right-0"}
                ${drawerClassName}
              `}
              style={{
                maxHeight,
                ...(maxWidth !== "100vw" && { maxWidth, width: maxWidth })
              }}
            >
              <div className={`
                bg-base-100/95 backdrop-blur-md shadow-2xl
                border-b border-base-300
                ${className}
              `}>
                {/* 抽屜把手 */}
                <div className="flex justify-center py-3">
                  <motion.div
                    className="w-16 h-1.5 bg-base-300 rounded-full cursor-pointer"
                    onClick={closeDrawer}
                    whileHover={{ scale: 1.1, backgroundColor: '#a3a3a3' }}
                    whileTap={{ scale: 0.95 }}
                  />
                </div>

                {/* 抽屜內容 */}
                <div className="" style={{ maxHeight: `calc(${maxHeight})` }}>
                  {children}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 除錯資訊 - 固定在右下角 */}
      {/*{process.env.NODE_ENV === 'development' && (*/}
      {/*  <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-[9999] font-mono">*/}
      {/*    <div>距離: {mouseDistance}px</div>*/}
      {/*    <div>感測範圍: {detectionDistance}px</div>*/}
      {/*    <div>是否靠近: {isNear ? '是' : '否'}</div>*/}
      {/*    <div>是否可見: {isVisible ? '是' : '否'}</div>*/}
      {/*    <div>是否開啟: {isOpen ? '是' : '否'}</div>*/}
      {/*  </div>*/}
      {/*)}*/}
    </>
  );
};

export default Drawer;
