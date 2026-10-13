/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#F8FAFC",
        border: "#E2E8F0",
        primary: "#3776AB",
        primaryDark: "#2A5A87",
        accent: "#10B981",
        success: "#16A34A",
        danger: "#DC2626",
        mastered: "#7C3AED",
        ink: "#0F172A",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
