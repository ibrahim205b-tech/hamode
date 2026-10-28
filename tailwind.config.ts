import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", lg: "1.5rem" }, screens: { "2xl": "1320px" } },
    extend: {
      colors: {
        ink: {
          950: "#05070B",
          900: "#0A0E14",
          850: "#0E131B",
          800: "#131A24",
          700: "#1C2532",
          600: "#283344",
          500: "#3A475B",
          400: "#64748B",
          300: "#94A3B8",
          200: "#CBD5E1",
          100: "#E5EAF1",
          50: "#F3F5F8",
        },
        brand: {
          700: "#1A47C2",
          600: "#1F55E0",
          500: "#2F6BFF",
          400: "#5B8BFF",
          300: "#8FB0FF",
          100: "#E3ECFF",
        },
        cyan: { 500: "#06B6D4", 400: "#22D3EE", 300: "#67E8F9" },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        whatsapp: "#25D366",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem", "3xl": "1.5rem" },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(47,107,255,0.35), 0 8px 32px -8px rgba(47,107,255,0.45)",
        soft: "0 1px 2px rgba(15,23,42,0.06), 0 4px 12px -4px rgba(15,23,42,0.08)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2F6BFF 0%, #22D3EE 100%)",
        "hero-glow": "radial-gradient(60% 80% at 80% 0%, rgba(47,107,255,0.22) 0%, transparent 60%), radial-gradient(40% 60% at 10% 30%, rgba(34,211,238,0.12) 0%, transparent 60%)",
        "grid-lines": "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(-100%)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        "fade-up": "fade-up .35s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
