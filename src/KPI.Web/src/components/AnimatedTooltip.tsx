"use client"
import { AnimatePresence, motion, Transition } from "motion/react"
import React from "react"
import * as Tooltip from "@radix-ui/react-tooltip"

const spring: Transition = {
    visualDuration: 0.3,
    type: "spring",
    bounce: 0.6,
}

// AnimatedTooltip 組件的 props 接口
interface AnimatedTooltipProps {
    /** 觸發 tooltip 的子元素 */
    children: React.ReactNode
    /** Tooltip 顯示的內容 */
    content: React.ReactNode
    /** Tooltip 相對於觸發器的位置 */
    side?: "top" | "right" | "bottom" | "left"
    /** Tooltip 與觸發器的距離（像素） */
    sideOffset?: number
    /** Tooltip 沿著邊的對齊方式 */
    align?: "start" | "center" | "end"
    /** Tooltip 沿著對齊軸的偏移量（像素） */
    alignOffset?: number
    /** 是否禁用 tooltip */
    disabled?: boolean
    /** 延遲顯示時間（毫秒） */
    delayDuration?: number
    /** 是否跳過延遲邏輯 */
    skipDelayDuration?: number
    /** 自定義 CSS 類名 */
    className?: string
    /** 自定義動畫配置 */
    animationConfig?: {
        /** 初始狀態 */
        initial?: {
            opacity?: number
            y?: number
            x?: number
            scale?: number
        }
        /** 動畫狀態 */
        animate?: {
            opacity?: number
            y?: number
            x?: number
            scale?: number
        }
        /** 退出狀態 */
        exit?: {
            opacity?: number
            y?: number
            x?: number
            scale?: number
            transition?: Transition
        }
        /** 動畫過渡配置 */
        transition?: Transition
    }
    /** 是否顯示箭頭 */
    showArrow?: boolean
    /** 箭頭的自定義樣式類名 */
    arrowClassName?: string
    /** 內容容器的自定義樣式類名 */
    contentClassName?: string
    /** 當 tooltip 打開狀態改變時的回調 */
    onOpenChange?: (open: boolean) => void
    /** 手動控制 tooltip 的打開狀態 */
    open?: boolean
    /** 默認的打開狀態 */
    defaultOpen?: boolean
}

// TooltipStyles 組件的 props 接口
interface TooltipStylesProps {
    /** 自定義樣式覆蓋 */
    customStyles?: string
}

// 可重用的 Tooltip 組件
export function AnimatedTooltip({
    children,
    content,
    side = "top",
    sideOffset = 10,
    align = "center",
    alignOffset = 0,
    disabled = false,
    delayDuration = 300,
    skipDelayDuration = 300,
    className,
    animationConfig,
    showArrow = true,
    arrowClassName = "tooltip-arrow",
    contentClassName = "tooltip-content",
    onOpenChange,
    open: controlledOpen,
    defaultOpen = false,
}: AnimatedTooltipProps) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)

    // 使用受控或非受控狀態
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOpen !== undefined ? (onOpenChange || (() => {})) : setInternalOpen

    // 合併自定義動畫配置與默認配置
    const defaultAnimationConfig = {
        initial: { opacity: 0, y: 20, scale: 0.8 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: {
            opacity: 0,
            y: 20,
            scale: 0.8,
            transition: { duration: 0.1 },
        },
        transition: {
            ...spring,
            opacity: { ...spring, bounce: 0 },
        }
    }

    const finalAnimationConfig = {
        ...defaultAnimationConfig,
        ...animationConfig,
        initial: { ...defaultAnimationConfig.initial, ...animationConfig?.initial },
        animate: { ...defaultAnimationConfig.animate, ...animationConfig?.animate },
        exit: { ...defaultAnimationConfig.exit, ...animationConfig?.exit },
        transition: { ...defaultAnimationConfig.transition, ...animationConfig?.transition },
    }

    if (disabled) {
        return <>{children}</>
    }

    return (
        <Tooltip.Provider
            delayDuration={delayDuration}
            skipDelayDuration={skipDelayDuration}
        >
            <Tooltip.Root
                open={open}
                onOpenChange={setOpen}
                defaultOpen={defaultOpen}
            >
                <Tooltip.Trigger asChild>
                    {children}
                </Tooltip.Trigger>
                <AnimatePresence>
                    {open && (
                        <Tooltip.Portal forceMount>
                            <Tooltip.Content
                                asChild
                                side={side}
                                sideOffset={sideOffset}
                                align={align}
                                alignOffset={alignOffset}
                                className={className}
                            >
                                <motion.div
                                    className={contentClassName}
                                    initial={finalAnimationConfig.initial}
                                    animate={finalAnimationConfig.animate}
                                    exit={finalAnimationConfig.exit}
                                    transition={finalAnimationConfig.transition}
                                >
                                    {content}
                                    {showArrow && (
                                        <Tooltip.Arrow className={arrowClassName} />
                                    )}
                                </motion.div>
                            </Tooltip.Content>
                        </Tooltip.Portal>
                    )}
                </AnimatePresence>
            </Tooltip.Root>
        </Tooltip.Provider>
    )
}

// 樣式組件
export function TooltipStyles({ customStyles }: TooltipStylesProps = {}) {
    const defaultStyles = `
        .tooltip-content {
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 14px;
            line-height: 1;
            background-color: #FFFFFF;
            user-select: none;
            will-change: transform, opacity;
            color: #0f1115;
        }

        .tooltip-arrow {
            fill: #FFFFFF;
        }

        .tooltip-trigger {
            font-family: inherit;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #0f1115;
            background-color: #0b1011;
            border: 1px solid #1d2628;
            color: #f5f5f5;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 15px;
        }
    `

    return (
        <style>{defaultStyles + (customStyles || '')}</style>
    )
}
