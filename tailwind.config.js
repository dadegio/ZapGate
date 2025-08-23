/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 👈 abilita dark mode basato su classe
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

