module.exports = {
  content: [
    "./index.html",
    // This line is CRITICAL: it tells Tailwind to look inside all files ending in .js, .ts, .jsx, and .tsx in the src directory.
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}