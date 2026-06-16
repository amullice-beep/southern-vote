import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Deployed to GitHub Pages at /southern-vote/.
  // For Vercel/Netlify root, change back to "/".
  base: "/southern-vote/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Southern Vote — 2026 Election Record Book",
        short_name: "Southern Vote",
        description:
          "Deadlines, redistricting status, precinct & ID distances, and absentee rules for nine Southern states.",
        theme_color: "#7E2A2A",
        background_color: "#F2ECDD",
        display: "standalone",
        orientation: "portrait",
        start_url: "/southern-vote/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Don't cache the OpenStreetMap geocoder — always hit the network for fresh results.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
