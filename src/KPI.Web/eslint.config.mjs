import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
      "next",
      "next/core-web-vitals",
      "next/typescript"
  ),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // 允許未使用的變數
      "no-unused-vars": "off", // 允許未使用的變數 (JS 版)
      "@typescript-eslint/no-explicit-any": "off", // 允許使用 any
      "react-hooks/exhaustive-deps": "warn", // 降低 useEffect 依賴檢查為警告
      "no-console": "off", // 允許 console.log()
      "no-debugger": "off", // 允許 debugger
      "react/react-in-jsx-scope": "off", // Next.js 預設無需 import React
    },
  },
];

export default eslintConfig;
