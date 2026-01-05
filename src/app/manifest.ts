import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rewind - Content Aggregator",
    short_name: "Rewind",
    description: "Your personal content aggregation and summarization companion. Never miss key insights from newsletters, podcasts, and RSS feeds.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    categories: ["news", "productivity", "education"],
    icons: [
      {
        src: "/icons/icon-72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile-home.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Home screen with recent summaries",
      },
      {
        src: "/screenshots/desktop-home.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop view with sidebar navigation",
      },
    ],
    shortcuts: [
      {
        name: "Search",
        short_name: "Search",
        url: "/search",
        description: "Search your content library",
      },
      {
        name: "Subscriptions",
        short_name: "Subs",
        url: "/subscriptions",
        description: "Manage your subscriptions",
      },
      {
        name: "Add Source",
        short_name: "Add",
        url: "/subscriptions?add=true",
        description: "Add a new content source",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
