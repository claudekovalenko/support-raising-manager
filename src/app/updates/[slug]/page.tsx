import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { Photo } from "@/components/Photo";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export default async function UpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [update, user] = await Promise.all([
    db.update.findUnique({ where: { slug }, include: { photos: { orderBy: { createdAt: "asc" } } } }),
    getCurrentUser(),
  ]);
  const isAdmin = user?.role === "ADMIN";
  if (!update || (update.status !== "PUBLISHED" && !isAdmin)) notFound();

  const locked = update.visibility === "SUPPORTERS" && !user;

  return (
    <PublicShell>
      <article className="container-page max-w-3xl! py-12">
        <Link href="/updates" className="text-sm text-muted hover:text-ink">← All updates</Link>
        <p className="mt-6 mb-2 text-sm text-muted">
          Week of {update.weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {update.status !== "PUBLISHED" && <span className="badge ml-2 bg-amber-100 text-amber-800">Draft preview</span>}
        </p>
        <h1 className="h-display mb-8">{update.title}</h1>
        {locked ? (
          <div className="card text-center">
            <p className="mb-4">This update is shared with our ministry partners.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/login?next=/updates/${update.slug}`} className="btn-primary">Sign in to read</Link>
              <Link href="/give" className="btn-secondary">Become a partner</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="prose-update" dangerouslySetInnerHTML={{ __html: renderMarkdown(update.body) }} />
            {update.photos.length > 0 && (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {update.photos.map((p) => (
                  <figure key={p.id} className={update.photos.length === 1 ? "sm:col-span-2" : ""}>
                    <Photo fileName={p.fileName} alt={p.caption} className="w-full rounded-2xl object-cover" />
                    {p.caption && <figcaption className="mt-2 text-sm text-muted">{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            <div className="card mt-12 flex flex-col items-start gap-4 bg-brand-soft/50 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-serif text-lg">Thank you for being part of this with us.</p>
              <Link href="/give" className="btn-primary">Support our work</Link>
            </div>
          </>
        )}
      </article>
    </PublicShell>
  );
}
