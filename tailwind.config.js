/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },

      boxShadow: {
        suave: "0 8px 30px rgba(15, 23, 42, 0.08)",
      },

      borderRadius: {
        card: "1rem",
      },
    },
  },

  plugins: [],
};