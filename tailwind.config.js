/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: "#f0f5fa",
          100: "#dce8f3",
          200: "#b9d1e6",
          300: "#8cb3d3",
          400: "#5b8fbd",
          500: "#3b72a3",
          600: "#2e5a87",
          700: "#1e3a5f",
          800: "#1a3150",
          900: "#172a44",
        },
        accent: {
          DEFAULT: "#3b82f6",
          soft: "#60a5fa",
        },
        warning: "#f59e0b",
        success: "#10b981",
        danger: "#ef4444",
      },
      fontFamily: {
        display: ['"Noto Serif SC"', "serif"],
        sans: ['"PingFang SC"', "system-ui", "sans-serif"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(239,68,68,0.4)" },
          "50%": { opacity: "0.85", boxShadow: "0 0 0 8px rgba(239,68,68,0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        breathe: "breathe 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out both",
        "slide-in": "slideIn 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
