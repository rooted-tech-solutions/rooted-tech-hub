import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        // Borderless marketing cards. The Hub uses hairline borders instead,
        // which is part of what keeps the two surfaces distinct.
        soft: "0 1px 2px rgba(18,36,28,0.04), 0 12px 32px -12px rgba(18,36,28,0.14)",
        lift: "0 2px 4px rgba(18,36,28,0.05), 0 24px 48px -16px rgba(18,36,28,0.20)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          dark: "#1B4332",
          mid: "#2D6A4F",
          light: "#D8EAE0",
          cream: "#F7F4EE",
          brown: "#8B5E3C",
        },
        // Public marketing site only — see app/(marketing)/.
        // A separate namespace so nothing here can change how an existing
        // brand-* class renders in the Hub. Adding keys is purely additive.
        site: {
          ink: "#12241C",     // display headings, deeper than brand-dark
          body: "#4A5A52",    // body copy
          mute: "#7C8C84",    // captions, labels
          mint: "#E8F3EC",    // hero gradient, tinted bands
          wash: "#F4FAF6",    // lightest band
          line: "#E4EFE8",    // hairlines
          accent: "#2D6A4F",  // = brand-mid, CTAs
          deep: "#14392A",    // footer
        },
      },
    },
  },
  plugins: [],
};
export default config;
