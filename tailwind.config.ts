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
          50: "#fdf7f8",
          100: "#f8e8eb",
          500: "#7a1f35",
          700: "#5d1228",
          900: "#2a0712"
        },
        accent: {
          500: "#b43d46"
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
        card: "0 18px 40px -22px rgba(10, 2, 5, 0.75)"
      }
    }
  },
  plugins: []
};

export default config;
