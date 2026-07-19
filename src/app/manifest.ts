import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wanna Dimsum POS",
    short_name: "WD POS",
    description: "Sistem POS internal Wanna Dimsum untuk kasir, dapur, inventori, manager, dan owner.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9F2",
    theme_color: "#A91F34",
    orientation: "any",
    categories: ["business", "productivity", "food"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
