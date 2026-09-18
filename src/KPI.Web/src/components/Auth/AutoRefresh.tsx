'use client'

import {useAutoRefresh} from "@/components/Auth/useAutoRefresh";

/**
 * 自動刷新 Token 的組件
 * 可以在 layout 中使用此組件來自動處理 Token 刷新
 */
export default function AutoRefresh() {
  // 使用自動刷新 hook
  useAutoRefresh();

  // 此組件不渲染任何內容，只處理 Token 刷新邏輯
  return null;
}
