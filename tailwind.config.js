/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:'Inter', 
      },
      boxShadow: {
        shape:'0px 8px 8px rgba(0, 0, 0, 0.1), 8px 4px 4px rgba(0, 0, 0, 0.1), 8px 2px 2px rgba(0, 0, 0, 0.1), 0px 0px 0px 1px rgba(0, 0, 0, 0.1), insert 0px 0px 0px 1px rgba(255, 255, 255, 0.03), insert 0px 1px 0px rgba(255, 255, 255, 0.03)'
      }
    },
  },
  plugins: [],
}
