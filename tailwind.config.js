/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        clock: "0 18px 45px rgba(22, 28, 45, 0.12)",
        digital: "0 22px 55px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};
