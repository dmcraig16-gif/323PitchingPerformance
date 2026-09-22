/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Apple's system blue — the one accent color used for every
        // primary action, so it reads consistently across the app.
        accent: {
          DEFAULT: '#0071e3',
          50: '#eef6fd',
          600: '#0066cc',
          700: '#004f9e',
        },
        success: '#34c759',
        warning: '#ff9f0a',
        danger: '#ff3b30',
        canvas: '#f5f5f7',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.06)',
        elevated: '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px -8px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
