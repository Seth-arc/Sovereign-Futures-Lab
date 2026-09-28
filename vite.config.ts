import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        landing: "index.html",
        about: "about.html",
        workshop: "workshop/index.html",
        facilitator: "facilitator/index.html",
      },
    },
  },
});
