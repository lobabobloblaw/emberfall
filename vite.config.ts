import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    // keep pixel-art PNGs as files, never inlined/base64'd
    assetsInlineLimit: 0,
    target: "es2022"
  }
});
