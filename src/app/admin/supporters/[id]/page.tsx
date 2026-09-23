import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatMoney, INTERVAL_LABELS } from "@/lib/money";
import { SupporterFields } from "../SupporterFields";
import { addPledge, deleteGift, deleteSupporter, recordGift, updatePledgeStatus, updateSupporter } from "../actions";

const NOTICES: Record<string, string> = {
  saved: "Saved.",
  gift: "Gift recorded.",
  exists: "That email already exists — here's their record.",
  invalid: "Please check the amount and try again.",
  admin: "Admin accounts can't be deleted here.",
};

export default async function SupporterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await db.user.findUnique({
    where: { id },
    include: {
      pledges: { orderBy: { createdAt: "desc" } },
      gifts: { orderBy: { receivedAt: "desc" } },
      deliveries: { orderBy: { createdAt: "desc" }, take: 10, include: { update: { select: { title: true } } } },
    },
  });
  if (!s) notFound();
  const totalGiven = s.gifts.reduce((sum, g) => sum + g.amountCents, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Link href="/admin/supporters" className="text-sm text-muted">← Supporters</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-section">{s.name || s.email}</h1>
          <p className="text-sm text-muted">
            <a href={`mailto:${s.email}`} className="hover:text-brand">{s.email}</a>
            {s.phone && <> · <a href={`tel:${s.phone}`} className="hover:text-brand">{s.phone}</a></>}
            {" · "}joined {s.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted uppercase">Total given</p>
          <p className="font-serif text-2xl">{formatMoney(totalGiven)}</p>
        </div>
      </div>
      {sp.notice && NOTICES[sp.notice] && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{NOTICES[sp.notice]}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <form action={updateSupporter} className="card space-y-5">
          <input type="hidden" name="id" value={s.id} />
          <h2 className="font-semibold">Contact & preferences</h2>
          <SupporterFields s={s} />
          <SubmitButton>Save</SubmitButton>
        </form>

        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold">Commitments</h2>
            {s.pledges.length === 0 && <p className="text-sm text-muted">No commitments yet.</p>}
            {s.pledges.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream p-3">
                <div>
                  <p className="font-medium">{formatMoney(p.amountCents)} <span className="text-sm font-normal text-muted">{INTERVAL_LABELS[p.interval]}</span></p>
                  <p className="text-xs text-muted">{p.status.toLowerCase()} · {p.method === "STRIPE" ? "Stripe" : p.method.toLowerCase()} · since {p.startedAt.toLocaleDateString()}</p>
                </div>
                {p.stripeSubscriptionId ? (
                  <span className="text-xs text-muted" title="Managed by the supporter or in Stripe">Stripe</span>
                ) : (
                  <form action={updatePledgeStatus} className="flex gap-1">
                    <input type="hidden" name="pledgeId" value={p.id} />
                    {p.status !== "ACTIVE" && <SubmitButton name="status" value="ACTIVE" className="btn-ghost px-2! py-1! text-xs" pendingText="…">Activate</SubmitButton>}
                    {p.status === "ACTIVE" && <SubmitButton name="status" value="PAUSED" className="btn-ghost px-2! py-1! text-xs" pendingText="…">Pause</SubmitButton>}
                    {p.status !== "CANCELED" && <SubmitButton name="status" value="CANCELED" className="btn-ghost px-2! py-1! text-xs text-red-700" pendingText="…">End</SubmitButton>}
                  </form>
                )}
              </div>
            ))}
            <details className="rounded-xl border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">+ Add commitment</summary>
              <form action={addPledge} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="userId" value={s.id} />
                <input name="amount" placeholder="Amount ($)" inputMode="decimal" required className="input" />
                <select name="interval" className="input">
                  <option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="ANNUAL">Yearly</option><option value="ONE_TIME">One time</option>
                </select>
                <select name="method" className="input">
                  <option value="OTHER">Sending org / other</option><option value="CHECK">Check</option><option value="BANK">Bank transfer</option><option value="ZELLE">Zelle</option>
                </select>
                <input type="date" name="startedAt" defaultValue={today} className="input" />
                <SubmitButton className="btn-primary sm:col-span-2">Add</SubmitButton>
              </form>
            </details>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Gifts received</h2>
            <details className="rounded-xl border border-dashed border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">+ Record a gift</summary>
              <form action={recordGift} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="userId" value={s.id} />
                <input name="amount" placeholder="Amount ($)" inputMode="decimal" required className="input" />
                <input type="date" name="receivedAt" defaultValue={today} className="input" />
                <select name="method" className="input">
                  <option value="CHECK">Check</option><option value="BANK">Bank transfer</option><option value="ZELLE">Zelle</option><option value="CASH">Cash</option><option value="OTHER">Sending org / other</option>
                </select>
                <input name="note" placeholder="Note (check #, etc.)" className="input" />
                <SubmitButton className="btn-primary sm:col-span-2">Record gift</SubmitButton>
              </form>
            </details>
            {s.gifts.length === 0 ? (
              <p className="text-sm text-muted">No gifts recorded.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {s.gifts.slice(0, 24).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{formatMoney(g.amountCents, { cents: true })}</strong>{" "}
                      <span className="text-muted">· {g.receivedAt.toLocaleDateString()} · {g.method.toLowerCase()}{g.note && ` · ${g.note}`}</span>
                    </span>
                    {!g.stripePaymentId && (
                      <form action={deleteGift}>
                        <input type="hidden" name="giftId" value={g.id} />
                        <SubmitButton className="btn-ghost px-2! py-1! text-xs" pendingText="…" confirm="Delete this gift record?">✕</SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">Updates sent</h2>
            {s.deliveries.length === 0 ? (
              <p className="text-sm text-muted">Nothing sent yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {s.deliveries.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span className="truncate">{d.update?.title ?? d.subject}</span>
                    <span className={`shrink-0 text-xs ${d.status === "FAILED" ? "text-red-700" : "text-muted"}`}>{d.channel.toLowerCase()} · {d.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={deleteSupporter} className="text-right">
            <input type="hidden" name="id" value={s.id} />
            <SubmitButton className="btn-danger" pendingText="Deleting…" confirm="Permanently delete this supporter and their history?">Delete supporter</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
