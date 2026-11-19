import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prestap — Gestión de Préstamos y Cobranzas",
    short_name: "Prestap",
    description: "Sistema de gestión inteligente de microcréditos",
    start_url: "/login",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b0f19",
    theme_color: "#1767FA",
    lang: "es",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Nuevo Préstamo",
        short_name: "Préstamo",
        url: "/dashboard/prestamos",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Registrar Cobro",
        short_name: "Cobro",
        url: "/dashboard/pagos",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
