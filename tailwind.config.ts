import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vp: {
          navy: "#06091D",
          blue: "#2A5AE6",
          "blue-light": "#5A8CFF",
          "blue-hover": "#1d47c4",
          risk: "#A32D2D",
          "risk-bg": "#FCEBEB",
          warn: "#854F0B",
          "warn-bg": "#FAEEDA",
          good: "#0F6E56",
          "good-bg": "#E1F5EE",
          beyond: "#fefdf8",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
