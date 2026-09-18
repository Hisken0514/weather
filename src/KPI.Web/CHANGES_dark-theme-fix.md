# 修改紀錄 — 深色主題文字看不到問題

## 問題
系統為深色模式時，許多頁面文字看不到。

根本原因：`globals.css` 有 `@media (prefers-color-scheme: dark)`，會讓背景色自動變深（`#0a0a0a`），
但站內絕大多數元件的文字顏色是寫死的（例如 `text-gray-800`），沒有加上 Tailwind 的 `dark:` 前綴。
`tailwind.config.ts` 也沒有設定 `darkMode`，`dark:` class 系統實際上未啟用；daisyui 的 `fantasydark`
主題內容跟 `fantasy` 完全相同（複製貼上忘了改色），且 `darkTheme` 仍設為 `"fantasy"`，深色主題從未真正生效。
結果：背景變深、文字不變深 → 深底深字 → 看不到。

## 修改內容

檔案：[`src/app/globals.css`](src/app/globals.css)

1. 在 `:root` 加上 `color-scheme: light;`，明確告知瀏覽器此站固定使用淺色配色（含原生表單控件、捲軸等）。
2. 移除 `@media (prefers-color-scheme: dark) { :root { --background: #0a0a0a; --foreground: #ededed; } }` 整段，
   讓背景色不再隨系統深色模式自動切換為深色。

## 效果
全站背景固定維持淺色，不會再因使用者系統開啟深色模式而導致背景變深、文字讀不到的問題。

## 未來若要做「真正的深色模式」
需要：
- `tailwind.config.ts` 設定 `darkMode: "class"`
- 補上 `fantasydark` daisyui 主題的真實深色配色（目前跟 `fantasy` 一樣）
- 逐頁/逐元件把寫死的文字顏色 class 補上對應 `dark:` 變體
- 加上主題切換 UI 並在 `<html>` 上切換 `data-theme`

這次修改範圍只鎖定全站背景色，未做上述完整深色模式改造。
