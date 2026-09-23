import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatMoney, monthlyEquivalent } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { recordGift } from "../supporters/actions";

export default async function FinancesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [gifts, pledges, recent] = await Promise.all([
    db.gift.findMany({ where: { receivedAt: { gte: since } }, select: { amountCents: true, receivedAt: true } }),
    db.pledge.findMany({ where: { status: "ACTIVE" }, include: { user: { include: { gifts: { orderBy: { receivedAt: "desc" }, take: 1 } } } } }),
    db.gift.findMany({ orderBy: { receivedAt: "desc" }, take: 30, include: { user: true } }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const total = gifts
      .filter((g) => g.receivedAt.getFullYear() === d.getFullYear() && g.receivedAt.getMonth() === d.getMonth())
      .reduce((s, g) => s + g.amountCents, 0);
    return { label: d.toLocaleDateString("en-US", { month: "short" }), year: d.getFullYear(), total };
  });
  const max = Math.max(settings.monthlyGoalCents, ...months.map((m) => m.total), 1);
  const committed = pledges.reduce((s, p) => s + monthlyEquivalent(p.amountCents, p.interval), 0);
  const trailing = months.slice(-3).reduce((s, m) => s + m.total, 0) / 3;

  const byMethod = new Map<string, number>();
  for (const p of pledges) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + monthlyEquivalent(p.amountCents, p.interval));

  // Monthly partners who give outside Stripe and haven't had a gift recorded in 45+ days.
  const overdue = pledges.filter(
    (p) =>
      p.interval === "MONTHLY" &&
      p.method !== "STRIPE" &&
      (!p.user.gifts[0] || Date.now() - p.user.gifts[0].receivedAt.getTime() > 45 * 86_400_000) &&
      Date.now() - p.startedAt.getTime() > 45 * 86_400_000,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-section">Finances</h1>
        <a href="/admin/finances/export" className="btn-secondary">Export gifts CSV</a>
      </div>
      {sp.notice === "gift" && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Gift recorded.</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card"><p className="text-xs text-muted uppercase">Monthly goal</p><p className="font-serif text-2xl">{formatMoney(settings.monthlyGoalCents)}</p></div>
        <div className="card"><p className="text-xs text-muted uppercase">Committed</p><p className="font-serif text-2xl">{formatMoney(committed)}</p></div>
        <div className="card"><p className="text-xs text-muted uppercase">Avg received (3 mo)</p><p className="font-serif text-2xl">{formatMoney(Math.round(trailing))}</p></div>
        <div className="card"><p className="text-xs text-muted uppercase">Last 12 months</p><p className="font-serif text-2xl">{formatMoney(months.reduce((s, m) => s + m.total, 0))}</p></div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Received by month</h2>
        <div className="relative flex h-48 items-end gap-1.5 sm:gap-3">
          <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent/60" style={{ bottom: `${(settings.monthlyGoalCents / max) * 100}%` }}>
            <span className="absolute -top-5 right-0 text-[10px] text-accent">goal</span>
          </div>
          {months.map((m, i) => (
            <div key={i} className="group flex h-full flex-1 flex-col justify-end">
              <div className="relative rounded-t-md bg-brand/80 transition group-hover:bg-brand" style={{ height: `${(m.total / max) * 100}%`, minHeight: m.total ? 2 : 0 }}>
                <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 text-[10px] whitespace-nowrap group-hover:block">{formatMoney(m.total)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-3">
          {months.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] text-muted">{m.label}</span>)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Commitments by payment method</h2>
          {byMethod.size === 0 ? <p className="text-sm text-muted">None yet.</p> : (
            <ul className="space-y-2 text-sm">
              {[...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([method, cents]) => (
                <li key={method} className="flex justify-between"><span>{method === "STRIPE" ? "Online (Stripe)" : method === "OTHER" ? "Sending org / other" : method.toLowerCase()}</span><span className="font-medium">{formatMoney(cents)}/mo</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="mb-1 font-semibold">Check in with</h2>
          <p className="mb-3 text-xs text-muted">Monthly partners giving offline with no gift recorded in 45+ days.</p>
          {overdue.length === 0 ? <p className="text-sm text-muted">Everyone&apos;s up to date. 👍</p> : (
            <ul className="space-y-1 text-sm">
              {overdue.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link href={`/admin/supporters/${p.userId}`} className="hover:text-brand">{p.user.name || p.user.email}</Link>
                  <span className="text-muted">{formatMoney(p.amountCents)}/mo</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Record an anonymous or unmatched gift</h2>
        <p className="mb-3 text-xs text-muted">For a known supporter, record it on their page so it shows in their history.</p>
        <form action={recordGift} className="grid gap-3 sm:grid-cols-5">
          <input name="amount" placeholder="Amount ($)" inputMode="decimal" required className="input" />
          <input type="date" name="receivedAt" defaultValue={now.toISOString().slice(0, 10)} className="input" />
          <select name="method" className="input"><option value="CHECK">Check</option><option value="BANK">Bank</option><option value="ZELLE">Zelle</option><option value="CASH">Cash</option><option value="OTHER">Other</option></select>
          <input name="note" placeholder="Note" className="input" />
          <SubmitButton>Record</SubmitButton>
        </form>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Recent gifts</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>From</th><th>Amount</th><th className="hidden sm:table-cell">Method</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted">No gifts yet.</td></tr>}
              {recent.map((g) => (
                <tr key={g.id}>
                  <td className="text-muted">{g.receivedAt.toLocaleDateString()}</td>
                  <td>{g.user ? <Link href={`/admin/supporters/${g.user.id}`} className="hover:text-brand">{g.user.name || g.user.email}</Link> : <span className="text-muted">Anonymous</span>}</td>
                  <td className="font-medium">{formatMoney(g.amountCents, { cents: true })}</td>
                  <td className="hidden text-muted sm:table-cell">{g.method.toLowerCase()}{g.note && ` · ${g.note}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
