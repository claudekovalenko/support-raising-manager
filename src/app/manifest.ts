import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.siteName,
    short_name: s.siteName.length > 12 ? "Support" : s.siteName,
    description: s.tagline,
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#1f4d3a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Write this week's update", url: "/admin/updates/new" },
      { name: "Supporters", url: "/admin/supporters" },
    ],
  };
}
