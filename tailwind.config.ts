import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        ink: "var(--color-text)",
        "ink-muted": "var(--color-text-muted)",
        "ink-faint": "var(--color-text-faint)",
        brand: "var(--color-brand)",
        "brand-strong": "var(--color-brand-strong)",
        signal: "var(--color-signal)",
        warning: "var(--color-warning)",
        critical: "var(--color-critical)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
