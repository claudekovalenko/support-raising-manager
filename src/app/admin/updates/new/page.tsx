import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { createUpdate } from "../actions";

export default async function NewUpdatePage() {
  const drafts = await db.update.findMany({ where: { status: "DRAFT" }, orderBy: { updatedAt: "desc" }, take: 5 });
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/admin/updates" className="text-sm text-muted">← Updates</Link>
      <div className="card text-center">
        <div className="mb-3 text-4xl">✎</div>
        <h1 className="h-section mb-2">This week&apos;s update</h1>
        <p className="mb-6 text-muted">We&apos;ll start you with a simple template: a story, praise, prayer requests, and what&apos;s next. Add photos, then send it everywhere at once.</p>
        <form action={createUpdate}>
          <SubmitButton pendingText="Creating…" className="btn-primary px-6 py-3 text-base">Start writing</SubmitButton>
        </form>
      </div>
      {drafts.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Or pick up a draft</h2>
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id}><Link href={`/admin/updates/${d.id}`} className="text-brand hover:underline">{d.title}</Link> <span className="text-xs text-muted">· edited {d.updatedAt.toLocaleDateString()}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
