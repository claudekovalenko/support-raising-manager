import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, monthlyEquivalent } from "@/lib/money";
import type { Prisma } from "@prisma/client";

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "partners", label: "Monthly partners" },
  { key: "none", label: "Not giving" },
  { key: "lapsed", label: "Stopped giving" },
  { key: "signal", label: "Signal group" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

export default async function SupportersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string; imported?: string; updated?: string; skipped?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const f = sp.f ?? "all";

  const where: Prisma.UserWhereInput = {
    role: "SUPPORTER",
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { tags: { contains: q } }, { phone: { contains: q } }] } : {}),
    ...(f === "partners" ? { pledges: { some: { status: "ACTIVE", interval: { not: "ONE_TIME" } } } } : {}),
    ...(f === "none" ? { pledges: { none: { status: { in: ["ACTIVE", "PAUSED"] } } } } : {}),
    ...(f === "lapsed" ? { AND: [{ pledges: { some: { status: "CANCELED" } } }, { pledges: { none: { status: { in: ["ACTIVE", "PAUSED"] } } } }] } : {}),
    ...(f === "signal" ? { signalMember: true } : {}),
    ...(f === "unsubscribed" ? { status: "UNSUBSCRIBED" } : {}),
  };

  const supporters = await db.user.findMany({
    where,
    orderBy: [{ name: "asc" }, { email: "asc" }],
    include: {
      pledges: { where: { status: { in: ["ACTIVE", "PAUSED"] } } },
      gifts: { orderBy: { receivedAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-section">Supporters</h1>
          <p className="text-sm text-muted">{supporters.length} shown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/supporters/export" className="btn-secondary">Export CSV</a>
          <Link href="/admin/supporters/import" className="btn-secondary">Import</Link>
          <Link href="/admin/supporters/new" className="btn-primary">+ Add supporter</Link>
        </div>
      </div>

      {sp.imported && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Import finished: {sp.imported} added, {sp.updated} updated{Number(sp.skipped) > 0 && `, ${sp.skipped} skipped (missing/invalid email)`}.
        </p>
      )}

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone, tag…" className="input" />
        <input type="hidden" name="f" value={f} />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/supporters?f=${x.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`badge shrink-0 px-3! py-1.5! text-sm ${f === x.key ? "bg-brand text-white" : "bg-white border border-line text-muted"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th className="hidden md:table-cell">Reach by</th><th>Giving</th><th className="hidden sm:table-cell">Last gift</th></tr>
          </thead>
          <tbody>
            {supporters.length === 0 && (
              <tr><td colSpan={4} className="py-10 text-center text-muted">No supporters match. <Link href="/admin/supporters/new" className="text-brand underline">Add one</Link>.</td></tr>
            )}
            {supporters.map((s) => {
              const monthly = s.pledges.filter((p) => p.status === "ACTIVE").reduce((sum, p) => sum + monthlyEquivalent(p.amountCents, p.interval), 0);
              const paused = s.pledges.some((p) => p.status === "PAUSED");
              return (
                <tr key={s.id} className="hover:bg-cream/60">
                  <td>
                    <Link href={`/admin/supporters/${s.id}`} className="font-medium hover:text-brand">{s.name || "(no name)"}</Link>
                    <p className="text-xs text-muted">{s.email}</p>
                    {s.status !== "ACTIVE" && <span className="badge mt-1 bg-slate-200 text-slate-700">{s.status.toLowerCase()}</span>}
                  </td>
                  <td className="hidden text-xs md:table-cell">
                    {[s.emailUpdates && "Email", s.smsUpdates && "Text", s.signalMember && "Signal"].filter(Boolean).join(" · ") || <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {monthly > 0 ? <span className="font-medium">{formatMoney(monthly)}/mo</span> : <span className="text-muted">—</span>}
                    {paused && <span className="badge ml-1 bg-slate-200 text-slate-700">paused</span>}
                  </td>
                  <td className="hidden text-xs text-muted sm:table-cell">
                    {s.gifts[0] ? `${formatMoney(s.gifts[0].amountCents)} · ${s.gifts[0].receivedAt.toLocaleDateString()}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
