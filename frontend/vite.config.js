import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: false,
    cssMinify: false
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080"
    }
  }
});
