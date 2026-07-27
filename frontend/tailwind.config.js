/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
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
    },
  },
  plugins: [],
}
