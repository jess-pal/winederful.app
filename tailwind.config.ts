import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6faf8",
          100: "#eaf4ee",
          500: "#2e6f4f",
          700: "#1f4d37",
          900: "#0f2a1e"
        },
        accent: {
          500: "#a44b2a"
        }
      },
      fontFamily: {
        heading: ["'Fraunces'", "serif"],
        body: ["'Manrope'", "sans-serif"]
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem"
      },
      boxShadow: {
        card: "0 12px 32px -18px rgba(15, 42, 30, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
