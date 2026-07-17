/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF385C", // Airbnb red
          hover: "#E61E4D",
          light: "#FFF0F2",
        },
      },
    },
  },
  plugins: [],
}
