import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rewind — Your Knowledge, Distilled",
    short_name: "Rewind",
    description: "Transform newsletters, podcasts, and articles into actionable insights. AI-powered summaries that respect your time and amplify your understanding.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f0d",
    theme_color: "#1a9a8a",
    orientation: "portrait-primary",
    categories: ["news", "productivity", "education", "utilities"],
    dir: "ltr",
    lang: "en",
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
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile-home.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Home screen with AI-powered summaries",
      },
      {
        src: "/screenshots/desktop-home.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Desktop view with elegant sidebar navigation",
      },
    ],
    shortcuts: [
      {
        name: "Search Content",
        short_name: "Search",
        url: "/search",
        description: "Search your knowledge library",
      },
      {
        name: "Content Library",
        short_name: "Library",
        url: "/content",
        description: "Browse all your content",
      },
      {
        name: "Sources",
        short_name: "Sources",
        url: "/subscriptions",
        description: "Manage your content sources",
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
