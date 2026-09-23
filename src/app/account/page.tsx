import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, INTERVAL_LABELS } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { changePledgeAmount, openBillingPortal, setPledgeStatus, updateProfile } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  PAUSED: "bg-slate-200 text-slate-700",
  CANCELED: "bg-red-100 text-red-700",
  COMPLETED: "bg-sky-100 text-sky-800",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser("/account");
  const [sp, settings, pledges, gifts] = await Promise.all([
    searchParams,
    getSettings(),
    db.pledge.findMany({ where: { userId: user.id, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" } }),
    db.gift.findMany({ where: { userId: user.id }, orderBy: { receivedAt: "desc" }, take: 24 }),
  ]);
  const openPledges = pledges.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED");
  const yearTotal = gifts
    .filter((g) => g.receivedAt.getFullYear() === new Date().getFullYear())
    .reduce((s, g) => s + g.amountCents, 0);

  return (
    <PublicShell>
      <div className="container-page max-w-4xl! py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">My account</p>
            <h1 className="h-display">Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</h1>
          </div>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost">Sign out</button>
          </form>
        </div>

        {sp.saved && <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved. Thank you!</p>}
        {sp.error === "amount" && <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Please enter an amount of at least $1.</p>}

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-section">My giving</h2>
            <Link href="/give" className="btn-secondary">+ New gift</Link>
          </div>
          {openPledges.length === 0 ? (
            <div className="card text-center">
              <p className="mb-4 text-muted">You don&apos;t have an active commitment right now.</p>
              <Link href="/give" className="btn-primary">Start giving</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {openPledges.map((p) => (
                <div key={p.id} className="card">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-serif text-2xl">
                        {formatMoney(p.amountCents)} <span className="text-base text-muted">{INTERVAL_LABELS[p.interval]}</span>
                      </p>
                      <p className="text-sm text-muted">
                        Since {p.startedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })} ·{" "}
                        {p.method === "STRIPE" ? "Online" : "Check / transfer"}
                      </p>
                    </div>
                    <span className={`badge ${STATUS_STYLES[p.status]}`}>{p.status.toLowerCase()}</span>
                  </div>
                  {p.interval !== "ONE_TIME" && (
                    <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <form action={changePledgeAmount} className="flex items-end gap-2">
                        <input type="hidden" name="pledgeId" value={p.id} />
                        <div>
                          <label className="label" htmlFor={`amt-${p.id}`}>Change amount</label>
                          <div className="relative">
                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">$</span>
                            <input id={`amt-${p.id}`} name="amount" inputMode="decimal" defaultValue={(p.amountCents / 100).toString()} className="input w-32 pl-7" />
                          </div>
                        </div>
                        <SubmitButton className="btn-secondary" pendingText="Updating…">Update</SubmitButton>
                      </form>
                      <form action={setPledgeStatus} className="flex gap-2">
                        <input type="hidden" name="pledgeId" value={p.id} />
                        {p.status === "ACTIVE" ? (
                          <SubmitButton name="status" value="PAUSED" className="btn-secondary" pendingText="…">Pause</SubmitButton>
                        ) : (
                          <SubmitButton name="status" value="ACTIVE" className="btn-secondary" pendingText="…">Resume</SubmitButton>
                        )}
                        <SubmitButton name="status" value="CANCELED" className="btn-danger" pendingText="…" confirm="Stop this recurring gift?">
                          Stop
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {user.stripeCustomerId && (
            <form action={openBillingPortal} className="mt-4">
              <SubmitButton className="btn-ghost" pendingText="Opening…">Update card or bank details →</SubmitButton>
            </form>
          )}
        </section>

        <section className="mb-8">
          <h2 className="h-section mb-4">How we stay in touch</h2>
          <form action={updateProfile} className="card space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input id="name" name="name" defaultValue={user.name} className="input" />
              </div>
              <div>
                <label className="label">Email</label>
                <input value={user.email} disabled className="input bg-sand/40 text-muted" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Mobile phone</label>
                <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="address">Mailing address <span className="font-normal text-muted">(for prayer cards)</span></label>
                <input id="address" name="address" defaultValue={user.address ?? ""} className="input" />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="label">Send me updates by</legend>
              <label className="flex items-center gap-3"><input type="checkbox" name="emailUpdates" defaultChecked={user.emailUpdates} className="h-4 w-4 accent-brand" /> Email</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="smsUpdates" defaultChecked={user.smsUpdates} className="h-4 w-4 accent-brand" /> Text message (needs a phone number)</label>
              <label className="flex items-center gap-3"><input type="checkbox" name="signalMember" defaultChecked={user.signalMember} className="h-4 w-4 accent-brand" /> Add me to the Signal group</label>
              {user.signalMember && settings.signalGroupLink && (
                <a href={settings.signalGroupLink} className="ml-7 text-sm font-semibold text-brand underline" target="_blank" rel="noopener">Join the Signal group →</a>
              )}
            </fieldset>
            <SubmitButton>Save preferences</SubmitButton>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="h-section">Giving history</h2>
            {yearTotal > 0 && <p className="text-sm text-muted">{formatMoney(yearTotal)} in {new Date().getFullYear()}</p>}
          </div>
          {gifts.length === 0 ? (
            <p className="text-muted">No gifts recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
                <tbody>
                  {gifts.map((g) => (
                    <tr key={g.id}>
                      <td>{g.receivedAt.toLocaleDateString()}</td>
                      <td className="font-medium">{formatMoney(g.amountCents, { cents: true })}</td>
                      <td className="text-muted">{g.method === "STRIPE" ? "Online" : g.method.toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
