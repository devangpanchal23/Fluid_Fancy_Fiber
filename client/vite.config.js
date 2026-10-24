import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  publicDir: "public",
  plugins: [
    react(),
    visualizer({ filename: "dist/bundle-analysis.html", template: "treemap", gzipSize: true, brotliSize: true, open: false })
  ],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:5001",
        changeOrigin: true
      }
    }
  }
});
