"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "◎" },
  { href: "/admin/supporters", label: "Supporters", icon: "☺" },
  { href: "/admin/updates", label: "Updates", icon: "✎" },
  { href: "/admin/finances", label: "Finances", icon: "$" },
  { href: "/admin/settings", label: "Website", icon: "⚙" },
];

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  if (mobile) {
    return (
      <nav className="grid grid-cols-5">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(i.href) ? "text-brand font-semibold" : "text-muted"}`}>
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex gap-1 text-sm">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={`rounded-lg px-3 py-1.5 ${active(i.href) ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:text-ink"}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
