/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // New design tokens based on specification
        navy: {
          DEFAULT: "#0f1a3c",
          dark: "#14213d",
        },
        accent: {
          DEFAULT: "#2f5fe3",
          light: "#e8f0ff",
        },
        background: "#8b95a8",
        // Status colors
        status: {
          green: "#10b981",
          greenLight: "#d1fae5",
          amber: "#f59e0b",
          amberLight: "#fef3c7",
          red: "#ef4444",
          redLight: "#fee2e2",
          gray: "#6b7280",
          grayLight: "#f3f4f6",
        },
        // Keep existing colors for compatibility
        ink: {
          DEFAULT: "#12161C",
          800: "#1B2129",
          700: "#242C36",
        },
        paper: "#F1F2ED",
        line: "#DBDDD5",
        teal: {
          DEFAULT: "#2F6F5E",
          light: "#E4EEEA",
        },
        amber: {
          DEFAULT: "#C97A2B",
          light: "#F7E9D8",
        },
        rust: {
          DEFAULT: "#B4453A",
          light: "#F5DEDB",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
