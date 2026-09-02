import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Skyboy tokens (drawably-mapped). One palette, page-wide.
        paper: "#e3e3e1",
        "paper-deep": "#d9d9d6",
        card: "#fbfbfa",
        ink: "#18181b",
        body: "#474645",
        mute: "#a1a1aa",
        hairline: "#c9c9c6",
        pen: "#2724d1",
        "pen-deep": "#1c1a9e",
        error: "#d12724",
        success: "#188a42",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // One radius scale: 6px buttons / inputs, 10px cards, pill for badges.
        sm: "6px",
        md: "10px",
        lg: "16px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
} satisfies Config;
