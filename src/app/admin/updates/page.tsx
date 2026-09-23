import Link from "next/link";
import { db } from "@/lib/db";

export default async function UpdatesAdminPage() {
  const updates = await db.update.findMany({
    orderBy: { weekOf: "desc" },
    include: { _count: { select: { photos: true, deliveries: true } } },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-section">Updates</h1>
          <p className="text-sm text-muted">Write once — publish to your site, email, text, and share to Signal.</p>
        </div>
        <Link href="/admin/updates/new" prefetch={false} className="btn-primary">✎ New weekly update</Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Update</th><th>Status</th><th className="hidden sm:table-cell">Sent</th></tr></thead>
          <tbody>
            {updates.length === 0 && (
              <tr><td colSpan={3} className="py-10 text-center text-muted">No updates yet. Start your first weekly update!</td></tr>
            )}
            {updates.map((u) => (
              <tr key={u.id} className="hover:bg-cream/60">
                <td>
                  <Link href={`/admin/updates/${u.id}`} className="font-medium hover:text-brand">{u.title}</Link>
                  <p className="text-xs text-muted">
                    Week of {u.weekOf.toLocaleDateString()} · {u._count.photos} photo{u._count.photos === 1 ? "" : "s"} · {u.visibility === "PUBLIC" ? "public" : "partners only"}
                  </p>
                </td>
                <td>
                  <span className={`badge ${u.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{u.status.toLowerCase()}</span>
                </td>
                <td className="hidden text-xs text-muted sm:table-cell">
                  {u.sentAt ? `${u.sentAt.toLocaleDateString()} · ${u._count.deliveries} messages` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
