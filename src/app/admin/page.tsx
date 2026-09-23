import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, INTERVAL_LABELS, monthlyEquivalent } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { ProgressBar } from "@/components/ProgressBar";
import { emailConfigured, smsConfigured, stripeConfigured } from "@/lib/config";

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

export default async function AdminHome() {
  const settings = await getSettings();
  const [pledges, supporterCount, newThisMonth, giftsThisMonth, giftsYtd, recentGifts, recentPledges, drafts, lastSent] = await Promise.all([
    db.pledge.findMany({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { role: "SUPPORTER", status: { not: "UNSUBSCRIBED" } } }),
    db.user.count({ where: { role: "SUPPORTER", createdAt: { gte: monthStart() } } }),
    db.gift.aggregate({ _sum: { amountCents: true }, where: { receivedAt: { gte: monthStart() } } }),
    db.gift.aggregate({ _sum: { amountCents: true }, where: { receivedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    db.gift.findMany({ orderBy: { receivedAt: "desc" }, take: 6, include: { user: true } }),
    db.pledge.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true } }),
    db.update.count({ where: { status: "DRAFT" } }),
    db.update.findFirst({ where: { sentAt: { not: null } }, orderBy: { sentAt: "desc" } }),
  ]);
  const committed = pledges.reduce((s, p) => s + monthlyEquivalent(p.amountCents, p.interval), 0);
  const partners = new Set(pledges.filter((p) => p.interval !== "ONE_TIME").map((p) => p.userId)).size;
  const daysSinceUpdate = lastSent?.sentAt ? Math.floor((Date.now() - lastSent.sentAt.getTime()) / 86_400_000) : null;

  const setup = [
    !emailConfigured() && "Email sending isn't connected yet — emails print to the server log. Add RESEND_API_KEY.",
    !stripeConfigured() && "Online card giving isn't connected. Add STRIPE_SECRET_KEY to accept gifts online.",
    !smsConfigured() && "Text messages aren't connected (optional). Add Twilio keys to text updates.",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Dashboard</p>
          <h1 className="h-section">Good to see you.</h1>
        </div>
        <Link href="/admin/updates/new" className="btn-primary">✎ Write this week&apos;s update</Link>
      </div>

      {daysSinceUpdate !== null && daysSinceUpdate >= 7 && (
        <div className="card border-amber-200 bg-amber-50">
          It&apos;s been <strong>{daysSinceUpdate} days</strong> since your last update went out.{" "}
          <Link href="/admin/updates/new" className="font-semibold text-brand underline">Write one now</Link>
          {drafts > 0 && <> or finish one of your {drafts} draft{drafts > 1 ? "s" : ""}</>}.
        </div>
      )}

      <div className="card">
        <ProgressBar current={committed} goal={settings.monthlyGoalCents} label="monthly goal" />
        <p className="mt-2 text-sm text-muted">
          {committed < settings.monthlyGoalCents
            ? `${formatMoney(settings.monthlyGoalCents - committed)}/mo still needed.`
            : "Fully funded 🎉"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Monthly partners", value: partners.toString(), sub: `${supporterCount} contacts total` },
          { label: "Committed / month", value: formatMoney(committed), sub: `${formatMoney(committed * 12)} / year` },
          { label: "Received this month", value: formatMoney(giftsThisMonth._sum.amountCents ?? 0), sub: `${formatMoney(giftsYtd._sum.amountCents ?? 0)} this year` },
          { label: "New this month", value: newThisMonth.toString(), sub: "new supporters" },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{stat.label}</p>
            <p className="mt-1 font-serif text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent commitments</h2>
            <Link href="/admin/supporters" className="text-sm text-brand">All supporters →</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentPledges.length === 0 && <tr><td className="text-muted">No pledges yet.</td></tr>}
                {recentPledges.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/admin/supporters/${p.userId}`} className="font-medium hover:text-brand">{p.user.name || p.user.email}</Link></td>
                    <td>{formatMoney(p.amountCents)} <span className="text-muted">{INTERVAL_LABELS[p.interval]}</span></td>
                    <td className="text-right text-xs text-muted">{p.status.toLowerCase()} · {p.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent gifts received</h2>
            <Link href="/admin/finances" className="text-sm text-brand">Finances →</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {recentGifts.length === 0 && <tr><td className="text-muted">No gifts recorded yet.</td></tr>}
                {recentGifts.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.user?.name || g.user?.email || "Anonymous"}</td>
                    <td>{formatMoney(g.amountCents, { cents: true })}</td>
                    <td className="text-right text-xs text-muted">{g.receivedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {setup.length > 0 && (
        <div className="card bg-sand/40">
          <h2 className="mb-2 font-semibold">Finish setting up</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{setup.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="mt-2 text-xs text-muted">See README.md for step-by-step instructions.</p>
        </div>
      )}
    </div>
  );
}
