import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Photo } from "@/components/Photo";
import { ProgressBar } from "@/components/ProgressBar";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { monthlyCommitted } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [s, user, committed] = await Promise.all([getSettings(), getCurrentUser(), monthlyCommitted()]);
  const [heroPhoto, familyPhoto] = await Promise.all([
    s.heroPhotoId ? db.photo.findUnique({ where: { id: s.heroPhotoId } }) : null,
    s.familyPhotoId ? db.photo.findUnique({ where: { id: s.familyPhotoId } }) : null,
  ]);
  const updates = await db.update.findMany({
    where: { status: "PUBLISHED", ...(user ? {} : { visibility: "PUBLIC" }) },
    orderBy: { weekOf: "desc" },
    take: 3,
    include: { photos: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  return (
    <PublicShell>
      <section className="container-page grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">{s.tagline}</p>
          <h1 className="h-display mb-6">{s.siteName}</h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted">{s.heroText}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/give" className="btn-primary px-6 py-3 text-base">Become a monthly partner</Link>
            <Link href="/updates" className="btn-secondary px-6 py-3 text-base">Read our updates</Link>
          </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-sand">
          {heroPhoto ? (
            <Photo fileName={heroPhoto.fileName} alt={heroPhoto.caption || s.siteName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted">
              Add a hero photo in Dashboard → Website
            </div>
          )}
        </div>
      </section>

      <section id="about" className="border-y border-line/70 bg-white py-16">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Our mission</p>
            <p className="font-serif text-2xl leading-snug">{s.mission}</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Our vision</p>
            <p className="font-serif text-2xl leading-snug">{s.vision}</p>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <p className="eyebrow mb-3">Where we&apos;re investing</p>
        <h2 className="h-section mb-8">Focus areas</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {s.focusAreas.map((area, i) => (
            <div key={i} className="card">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">{i + 1}</div>
              <h3 className="mb-2 font-serif text-xl">{area.title}</h3>
              <p className="text-muted">{area.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand/60 py-16">
        <div className="container-page grid items-center gap-10 md:grid-cols-2">
          {familyPhoto && (
            <Photo fileName={familyPhoto.fileName} alt={familyPhoto.caption || "Our family"} className="aspect-[4/3] w-full rounded-3xl object-cover" />
          )}
          <div className={familyPhoto ? "" : "md:col-span-2 max-w-3xl"}>
            <p className="eyebrow mb-3">Meet the family</p>
            <p className="whitespace-pre-line text-lg leading-relaxed">{s.familyBio}</p>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="card mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-3">Join the team</p>
          <h2 className="h-section mb-4">Partner with us</h2>
          <p className="mx-auto mb-6 max-w-xl text-muted">
            Monthly partners make long-term work possible. Every gift — large or small — keeps us here and serving.
          </p>
          <div className="mx-auto mb-6 max-w-md text-left">
            <ProgressBar current={committed} goal={s.monthlyGoalCents} />
          </div>
          <Link href="/give" className="btn-primary px-6 py-3 text-base">Give now</Link>
        </div>
      </section>

      {updates.length > 0 && (
        <section className="container-page pb-20">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="h-section">Latest updates</h2>
            <Link href="/updates" className="text-sm font-semibold text-brand">All updates →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {updates.map((u) => (
              <Link key={u.id} href={`/updates/${u.slug}`} className="card group p-0! overflow-hidden transition hover:shadow-md">
                {u.photos[0] && (
                  <Photo fileName={u.photos[0].fileName} alt={u.photos[0].caption} className="aspect-video w-full object-cover" />
                )}
                <div className="p-5">
                  <p className="mb-1 text-xs text-muted">Week of {u.weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  <h3 className="font-serif text-lg group-hover:text-brand">{u.title}</h3>
                  {u.summary && <p className="mt-2 line-clamp-3 text-sm text-muted">{u.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
