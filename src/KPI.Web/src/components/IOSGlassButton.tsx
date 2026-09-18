import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function IOSGlassButton() {
  const [isPressed, setIsPressed] = useState(false);

  return (
      <motion.button
        type="button"
        aria-label="測試"
        className="relative overflow-hidden"
        style={{
          borderRadius: '0px 0px 12px 12px',
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          y: isPressed ? 2 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17
        }}
      >
        {/* 玻璃背景 */}
        <div
          className="absolute inset-0 bg-base-100/80 backdrop-blur-md border border-base-content/20"
          style={{
            borderRadius: '0px 0px 12px 12px',
          }}
        />

        {/* 內部高光效果 */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent"
          style={{
            borderRadius: '0px 0px 12px 12px',
          }}
        />

        {/* 按鈕內容 */}
        <div className="relative px-8 py-2 flex items-center justify-center">
          <motion.div
            animate={{
              rotate: isPressed ? 180 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <ChevronDown
              size={24}
              className="text-base-content drop-shadow-sm"
            />
          </motion.div>
        </div>

        {/* 底部反光效果 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary/40"
          style={{
            borderRadius: '0 0 12px 12px',
          }}
        />
      </motion.button>

  );
}
