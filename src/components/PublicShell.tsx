import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" className="min-w-0 truncate font-serif text-base font-semibold text-brand sm:text-xl">
            {settings.siteName}
          </Link>
          <nav className="flex shrink-0 items-center gap-1 text-sm whitespace-nowrap">
            <Link href="/#about" className="btn-ghost hidden sm:inline-flex">About</Link>
            <Link href="/updates" className="btn-ghost">Updates</Link>
            {user ? (
              <Link href={user.role === "ADMIN" ? "/admin" : "/account"} className="btn-ghost">
                {user.role === "ADMIN" ? "Dashboard" : "My account"}
              </Link>
            ) : (
              <Link href="/login" className="btn-ghost">Sign in</Link>
            )}
            <Link href="/give" className="btn-primary">Give</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line/70 py-10 text-sm text-muted">
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.siteName}</p>
          <div className="flex gap-4">
            {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">Contact</a>}
            <Link href="/account" className="hover:text-ink">Manage my giving</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
