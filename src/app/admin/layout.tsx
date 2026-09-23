import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireAdmin(), getSettings()]);
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="font-serif text-lg font-semibold text-brand">{settings.siteName}</Link>
          <div className="hidden md:block"><AdminNav /></div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="btn-ghost" target="_blank">View site ↗</Link>
            <form action="/auth/signout" method="post"><button className="btn-ghost" title={user.email}>Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white md:hidden"><AdminNav mobile /></div>
    </div>
  );
}
