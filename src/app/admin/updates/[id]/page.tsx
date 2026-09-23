import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { Photo } from "@/components/Photo";
import { db } from "@/lib/db";
import { APP_URL } from "@/lib/config";
import { buildSignalPost } from "@/lib/messaging";
import { getSettings } from "@/lib/settings";
import { deleteUpdate, resendToNew, saveUpdate, unpublishUpdate } from "../actions";
import { ShareTools } from "./ShareTools";

type SP = { notice?: string; error?: string; email?: string; sms?: string; failed?: string; skipped?: string };

export default async function EditUpdatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const [{ id }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const update = await db.update.findUnique({ where: { id }, include: { photos: { orderBy: { createdAt: "asc" } } } });
  if (!update) notFound();

  const [audience, deliveryStats] = await Promise.all([
    db.user.groupBy({
      by: ["emailUpdates", "smsUpdates"],
      where: { status: "ACTIVE", OR: [{ emailUpdates: true }, { smsUpdates: true, phone: { not: null } }] },
      _count: true,
    }),
    db.delivery.groupBy({ by: ["channel", "status"], where: { updateId: id }, _count: true }),
  ]);
  const emailCount = audience.filter((a) => a.emailUpdates).reduce((s, a) => s + a._count, 0);
  const smsCount = audience.filter((a) => a.smsUpdates).reduce((s, a) => s + a._count, 0);
  const signalCount = await db.user.count({ where: { status: "ACTIVE", signalMember: true } });
  const published = update.status === "PUBLISHED";
  const publicUrl = `${APP_URL}/updates/${update.slug}`;

  const notices: Record<string, string> = {
    saved: "Draft saved.",
    published: "Published to your website.",
    unpublished: "Moved back to drafts.",
    test: "Test email sent to you.",
    testfailed: "Test email failed — check your email settings.",
    sent: `Sent! ${sp.email ?? 0} emails, ${sp.sms ?? 0} texts${Number(sp.failed) ? `, ${sp.failed} failed` : ""}${Number(sp.skipped) ? ` (${sp.skipped} already had it)` : ""}.`,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/updates" className="text-sm text-muted">← Updates</Link>
        <div className="flex items-center gap-2">
          <span className={`badge ${published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{update.status.toLowerCase()}</span>
          <Link href={`/updates/${update.slug}`} target="_blank" className="btn-ghost">Preview ↗</Link>
        </div>
      </div>
      {sp.notice && notices[sp.notice] && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notices[sp.notice]}</p>}
      {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}

      <form action={saveUpdate} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <input type="hidden" name="id" value={update.id} />
        <div className="space-y-5">
          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" defaultValue={update.title} className="input font-serif text-lg!" required />
            </div>
            <div>
              <label className="label" htmlFor="summary">One-line summary</label>
              <input id="summary" name="summary" defaultValue={update.summary} maxLength={160} className="input" placeholder="Used in texts and previews, e.g. “Baptisms, a new team member, and a prayer need.”" />
            </div>
            <div>
              <label className="label" htmlFor="body">Update</label>
              <textarea id="body" name="body" defaultValue={update.body} rows={20} className="input font-serif text-base! leading-relaxed" />
              <p className="hint">## Heading · - bullet · **bold** · *italic* · [link text](https://…) · blank line = new paragraph</p>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">Photos</h2>
            {update.photos.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {update.photos.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <Photo fileName={p.fileName} alt={p.caption} className="aspect-video w-full rounded-xl object-cover" />
                    <input name={`caption:${p.id}`} defaultValue={p.caption} placeholder="Caption" className="input" />
                    <label className="flex items-center gap-2 text-xs text-red-700"><input type="checkbox" name="removePhoto" value={p.id} /> Remove</label>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="label" htmlFor="photos">Add photos</label>
              <input id="photos" name="photos" type="file" accept="image/*" multiple className="input" />
              <p className="hint">Photos upload when you save. JPG, PNG, WebP up to 15 MB each.</p>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="weekOf">Week of</label>
              <input id="weekOf" name="weekOf" type="date" defaultValue={update.weekOf.toISOString().slice(0, 10)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="visibility">Who can read it on the website</label>
              <select id="visibility" name="visibility" defaultValue={update.visibility} className="input">
                <option value="SUPPORTERS">Signed-in partners only</option>
                <option value="PUBLIC">Anyone (public)</option>
              </select>
              <p className="hint">Use partners-only for sensitive names, places, or prayer needs.</p>
            </div>
            <div className="flex flex-col gap-2">
              <SubmitButton name="intent" value="save" className="btn-secondary">Save draft</SubmitButton>
              <SubmitButton name="intent" value="test" className="btn-secondary" pendingText="Sending test…">Email me a test</SubmitButton>
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold">Send</h2>
            <ul className="space-y-1 text-sm text-muted">
              <li>📧 {emailCount} supporters by email</li>
              <li>📱 {smsCount} by text</li>
              <li>💬 {signalCount} in your Signal group</li>
            </ul>
            {!published ? (
              <>
                <SubmitButton name="intent" value="publish-send" className="btn-primary w-full" pendingText="Sending…" confirm={`Publish and send to ${emailCount} by email and ${smsCount} by text?`}>
                  Publish & send
                </SubmitButton>
                <SubmitButton name="intent" value="publish" className="btn-ghost w-full" pendingText="Publishing…">Publish to site only</SubmitButton>
              </>
            ) : (
              <>
                <SubmitButton name="intent" value="save" className="btn-primary w-full">Save changes</SubmitButton>
                {deliveryStats.length > 0 && (
                  <p className="text-xs text-muted">
                    Delivered: {deliveryStats.map((d) => `${d._count} ${d.channel.toLowerCase()} ${d.status.toLowerCase()}`).join(", ")}
                    {update.sentAt && ` · last sent ${update.sentAt.toLocaleString()}`}
                  </p>
                )}
              </>
            )}
          </div>
        </aside>
      </form>

      {published && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="card space-y-3">
            <h2 className="font-semibold">Share to Signal & social</h2>
            <ShareTools signalText={buildSignalPost(update)} url={publicUrl} signalGroupLink={settings.signalGroupLink} />
          </div>
          <div className="card space-y-3">
            <form action={resendToNew}>
              <input type="hidden" name="id" value={update.id} />
              <SubmitButton className="btn-secondary w-full" pendingText="Sending…" confirm="Send to anyone who hasn't received this update yet?">
                Send to people who haven&apos;t got it
              </SubmitButton>
            </form>
            <form action={unpublishUpdate}>
              <input type="hidden" name="id" value={update.id} />
              <SubmitButton className="btn-ghost w-full" pendingText="…">Unpublish</SubmitButton>
            </form>
          </div>
        </div>
      )}

      <form action={deleteUpdate} className="text-right">
        <input type="hidden" name="id" value={update.id} />
        <SubmitButton className="btn-danger" pendingText="Deleting…" confirm="Delete this update and its photos?">Delete update</SubmitButton>
      </form>
    </div>
  );
}
