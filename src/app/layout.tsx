import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { ServiceWorker } from "@/components/ServiceWorker";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.siteName, template: `%s · ${s.siteName}` },
    description: s.tagline,
    appleWebApp: { capable: true, title: s.siteName, statusBarStyle: "default" },
    icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  };
}

export const viewport: Viewport = { themeColor: "#1f4d3a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
