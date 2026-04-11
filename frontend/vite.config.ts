import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // 本地 npm run dev 固定根路径，避免误用本机全局 VITE_BASE_PATH（GitHub Pages 子路径）
  const base =
    mode === "development"
      ? "/"
      : (process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || "/");

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        "/health": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
    // npm run preview 默认不代理 /api，会导致 /api/chat 失败；与 dev 保持一致
    preview: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
        "/health": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
