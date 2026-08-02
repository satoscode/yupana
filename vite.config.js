import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Yupana",
        short_name: "Yupana",
        description: "Cobros y saldos de clientes con suscripción recurrente.",
        lang: "es",
        theme_color: "#0d9488",
        background_color: "#f5f5f4",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // No cachear las respuestas de Firestore/Auth: la app siempre debe
        // mostrar saldos y datos frescos, nunca una versión vieja servida
        // desde caché. El precache solo cubre el shell (JS/CSS/HTML).
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    host: true,
  },
});
