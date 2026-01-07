/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: { 600: '#2A9D8F' },
        cream: '#F5F0E6',
        ink: '#2C3E50',
        paper: '#FAF8F5',
        parchment: '#F0EBE0',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
};
