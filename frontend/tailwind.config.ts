import type { Config } from "tailwindcss";

/**
 * SkillScout design tokens — derived from the Stitch "Skill Scout" design system.
 * Aesthetic: Sleek Glassmorphic — atmospheric grayscale base + one high-energy accent (#EB4425).
 * Semantic scale names (primary-*, neutral-*) are kept so existing markup adopts the
 * new palette automatically; glass / Urbanist / radii are layered on top.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent — vibrant orange-red. Used sparingly for CTAs, match scores, AI highlights.
        primary: {
          50: "#FFF1ED",
          100: "#FFDAD3",
          200: "#FFB4A5",
          300: "#FF8A6E",
          400: "#F2603F",
          500: "#EB4425", // canonical brand accent
          600: "#D93719", // primary buttons
          700: "#B51D00", // hover / pressed
          800: "#8E1500",
          900: "#3E0400",
        },
        // Secondary — high-contrast near-black for nav + headings.
        secondary: {
          500: "#1A1C1C",
        },
        // Atmospheric grayscale — the "glass" surfaces. Exact Stitch surface values.
        neutral: {
          0: "#FFFFFF",
          50: "#F9F9F9",
          100: "#F3F3F3",
          200: "#E2E2E2",
          300: "#D2D2D0",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          900: "#1A1C1C",
        },
        success: {
          50: "#E9F6EE",
          600: "#16A34A",
        },
        warning: {
          50: "#FEF3E2",
          600: "#D97706",
        },
        danger: {
          50: "#FFDAD6",
          600: "#BA1A1A", // Stitch error
        },
        info: {
          600: "#D93719",
        },
        ai: {
          600: "#EB4425",
        },
      },
      borderRadius: {
        sm: "0.375rem", // 6px
        DEFAULT: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "1rem", // 16px — cards / panels
        xl: "1.5rem", // 24px — buttons / inputs
        "2xl": "2rem",
        app: "1rem",
      },
      fontFamily: {
        sans: ["var(--font-urbanist)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.02em",
        tighter: "-0.01em",
        label: "0.05em",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(26 28 28 / 0.05)",
        glass: "0 8px 32px -8px rgb(26 28 28 / 0.10)",
        "glass-lg": "0 20px 40px -12px rgb(26 28 28 / 0.12)",
        accent: "0 8px 24px -6px rgb(235 68 37 / 0.30)",
      },
      backdropBlur: {
        glass: "30px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
