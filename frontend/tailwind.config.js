/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 👈 核心：必须加上这一句
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}