/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens from docs/02_DESIGN.md and Design G board
        primary: {
          DEFAULT: "var(--color-primary, #14532D)",
          dark: "var(--color-primary-dark, #0C3B21)",
        },
        cream: {
          DEFAULT: "var(--color-bg-cream, #F6F2E7)",
          card: "var(--color-card-cream, #F6EBD7)",
        },
        surface: {
          tint: "var(--color-surface-tint, #E8F1E4)",
          alt: "var(--color-surface-tint-alt, #EFF4E4)",
        },
        ink: {
          DEFAULT: "var(--color-ink, #16130E)",
          muted: "var(--color-ink-muted, #43543F)",
        },
        success: {
          DEFAULT: "var(--color-success, #16A34A)",
          bright: "var(--color-success-bright, #22C55E)",
        },
        pending: {
          DEFAULT: "var(--color-pending, #B45309)",
          bg: "var(--color-pending-bg, #FEF3C7)",
        },
        alert: {
          DEFAULT: "var(--color-alert, #DC2626)",
          bg: "var(--color-alert-bg, #FEE2E2)",
        },
        disabled: {
          DEFAULT: "#9CA3AF",
          bg: "#F3F4F6",
        }
      },
      borderRadius: {
        'card-sm': '14px',
        'card': '18px',
        'card-lg': '20px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
