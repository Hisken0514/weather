import type { Config } from "tailwindcss";
import daisyui from "daisyui";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontSize: {
        xs: '0.75rem',       // 12px
        sm: '0.875rem',      // 14px ✅ 原為 px，這樣改為 rem
        base: '1rem',        // 16px
        lg: '1.125rem',      // 18px
        xl: '1.25rem',       // 20px
        "2xl": '1.5rem',     // 24px
        "3xl": '1.875rem',   // 30px
        "4xl": '2.25rem',    // 36px
        "5xl": '3rem',       // 48px
        "6xl": '3.75rem',    // 60px
        "7xl": '4.5rem',     // 72px
      },
    },
  },
  plugins: [daisyui, typography],
  daisyui: {
    themes: [
      {
        fantasy: {
          "primary": "#4062BB",
          "primary-content": "#F3F3F1",
          "secondary": "#28B5AD",
          "secondary-content": "#EBF2FA",
          "accent": "#EA5404",
          "accent-content": "#FFFFFF",
          "neutral": "#FFFFFF",
          "neutral-content": "#242C3A",
          "base-100": "#F3F6FA",
          "base-200": "#FCFCFC",
          "base-300": "#cad7f7",
          "base-content": "#292929",
          "info": "#C5E7E8",
          "info-content": "#234241",
          "success": "#7DB9DE",
          "success-content": "#00140e",
          "warning": "#FFC408",
          "warning-content": "#00140e",
          "error": "#952E27",
          "error-content": "#FFFFFF",
        },
      },
      {
        fantasydark: {
          "primary": "#4062BB",
          "primary-content": "#F3F3F1",
          "secondary": "#28B5AD",
          "secondary-content": "#EBF2FA",
          "accent": "#EA5404",
          "accent-content": "#FFFFFF",
          "neutral": "#FFFFFF",
          "neutral-content": "#242C3A",
          "base-100": "#F3F6FA",
          "base-200": "#FCFCFC",
          "base-300": "#cad7f7",
          "base-content": "#292929",
          "info": "#C5E7E8",
          "info-content": "#234241",
          "success": "#7DB9DE",
          "success-content": "#00140e",
          "warning": "#FFC408",
          "warning-content": "#00140e",
          "error": "#952E27",
          "error-content": "#FFFFFF",
        },
      },
    ],
    darkTheme: "fantasy",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
} satisfies Config;