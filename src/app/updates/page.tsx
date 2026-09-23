import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Photo } from "@/components/Photo";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Updates" };

export default async function UpdatesPage() {
  const user = await getCurrentUser();
  const updates = await db.update.findMany({
    where: { status: "PUBLISHED", ...(user ? {} : { visibility: "PUBLIC" }) },
    orderBy: { weekOf: "desc" },
    include: { photos: { take: 1, orderBy: { createdAt: "asc" } } },
  });
  const hiddenCount = user ? 0 : await db.update.count({ where: { status: "PUBLISHED", visibility: "SUPPORTERS" } });

  return (
    <PublicShell>
      <div className="container-page max-w-3xl! py-12">
        <p className="eyebrow mb-3">News from the field</p>
        <h1 className="h-display mb-8">Updates</h1>
        {hiddenCount > 0 && (
          <div className="card mb-8 bg-brand-soft/60">
            <p>
              {hiddenCount} update{hiddenCount === 1 ? " is" : "s are"} shared only with our partners.{" "}
              <Link href="/login?next=/updates" className="font-semibold text-brand underline">Sign in</Link> to read {hiddenCount === 1 ? "it" : "them"}.
            </p>
          </div>
        )}
        {updates.length === 0 && <p className="text-muted">No updates yet — check back soon.</p>}
        <div className="space-y-6">
          {updates.map((u) => (
            <Link key={u.id} href={`/updates/${u.slug}`} className="card group flex flex-col gap-5 transition hover:shadow-md sm:flex-row">
              {u.photos[0] && (
                <Photo fileName={u.photos[0].fileName} alt={u.photos[0].caption} className="aspect-video w-full rounded-xl object-cover sm:w-48" />
              )}
              <div>
                <p className="mb-1 text-xs text-muted">
                  Week of {u.weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {u.visibility === "SUPPORTERS" && <span className="badge ml-2 bg-sand">Partners only</span>}
                </p>
                <h2 className="font-serif text-xl group-hover:text-brand">{u.title}</h2>
                {u.summary && <p className="mt-2 text-muted">{u.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
