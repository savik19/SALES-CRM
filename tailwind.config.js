/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ScriptGuru brand blue — use for primary buttons, active states, links, highlights.
        brand: {
          DEFAULT: "#1060E0",
          50: "#EAF2FE",
          100: "#D6E5FD",
          600: "#1060E0",
          700: "#0D4EB8",
        },
      },
      fontFamily: {
        // Font per brand guide: IBM Plex Sans, falling back to Arial.
        sans: ["'IBM Plex Sans'", "Arial", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
