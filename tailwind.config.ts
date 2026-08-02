import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Press Cyan" — the primary accent, drawn from CMYK process cyan
        brand: {
          50: "#EAF7FC",
          100: "#CDEDF8",
          200: "#9CDCF2",
          500: "#0EA5D6",
          600: "#0B87B4",
          700: "#0A6C91",
          900: "#0B3A4D",
        },
        // Process magenta — reserved for priority/urgent accents only
        magenta: {
          50: "#FDEAF4",
          500: "#D6127E",
          600: "#B00E68",
        },
        // Ink scale — the dark neutral used for the sidebar and headings
        ink: {
          950: "#0B0D12",
          900: "#12141C",
          800: "#1C2029",
          700: "#2A2F3B",
          400: "#6B7280",
        },
        paper: "#F6F6F4",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.85rem",
      },
    },
  },
  plugins: [],
};

export default config;
