import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b5fe0",
          600: "#2f4bc7",
          700: "#263ca0",
          900: "#101d3f",
        },
      },
      borderRadius: {
        xl: "0.85rem",
      },
    },
  },
  plugins: [],
};

export default config;
