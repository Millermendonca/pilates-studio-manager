/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pilates: {
          50: '#f4f9f9',
          100: '#e5f2f2',
          200: '#cfe5e5',
          300: '#a7d2d3',
          400: '#75b5b7',
          500: '#4f979a',
          600: '#3e7c80',
          700: '#366468',
          800: '#305256',
          900: '#2c4649',
          950: '#192b2d',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e9ece4',
          200: '#d4dbcb',
          300: '#b7c4aa',
          400: '#9baa87',
          500: '#7e8f69',
          600: '#627150',
          700: '#4c583f',
          800: '#3f4735',
          900: '#363d2e',
        }
      },
    },
  },
  plugins: [],
};
