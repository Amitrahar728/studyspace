/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#A95031", // Terracotta primary (#A95031)
          hover: "#8E3F24",   // Terracotta hover
          light: "#F7EBE4",   // Light terracotta background tint
          dark: "#6E2D17",    // Deep terracotta accent
        },
        eggshell: {
          DEFAULT: "#F8F5EE", // Warm eggshell background
          card: "#FFFFFF",    // Warm white card surface
          border: "#E8E2D5",  // Soft eggshell border
          muted: "#F1EBE0",   // Slightly darker eggshell for input fields
        },
        warm: {
          text: "#221C19",    // Default dark text color
          muted: "#6B5E57",   // Muted brown text
          subtle: "#A0938A",  // Light subtle text
        },
      },
    },
  },
  plugins: [],
}
