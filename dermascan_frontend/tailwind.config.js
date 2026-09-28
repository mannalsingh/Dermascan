/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          primary: '#0F9D92',
          primaryHover: '#0C857B',
          primaryActive: '#096B63',
          tint: 'rgba(15, 157, 146, 0.15)',
          bg: '#F4FAF9',
          card: '#FFFFFF',
          cardBorder: '#E2ECEB',
          heading: '#102A43',
          body: '#334E68',
          muted: '#627D98',
          placeholder: '#829AB1',
          inputBorder: '#D8E2EC',
          inputBorderHover: '#BCCCDC',
          successBg: '#F0FDF4',
          successText: '#1B4D2E',
          successBorder: '#C3E6CD',
          errorBg: '#FEF2F2',
          errorText: '#7F1D1D',
          errorBorder: '#FECDCA',
        },
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        derma: {
          blue:    '#1d4ed8',
          teal:    '#0F9D92',
          green:   '#16a34a',
          yellow:  '#ca8a04',
          red:     '#dc2626',
          gray:    '#6b7280',
          light:   '#F4FAF9',
        }
      },
      boxShadow: {
        'medical-card': '0 4px 20px -2px rgba(16, 42, 67, 0.06), 0 2px 6px -1px rgba(16, 42, 67, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
