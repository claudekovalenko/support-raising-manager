import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { monthlyEquivalent } from "@/lib/money";

export async function GET() {
  await requireAdmin();
  const users = await db.user.findMany({
    where: { role: "SUPPORTER" },
    orderBy: { name: "asc" },
    include: { pledges: { where: { status: "ACTIVE" } }, gifts: true },
  });
  const csv = toCsv(
    users.map((u) => ({
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      address: u.address ?? "",
      status: u.status,
      email_updates: u.emailUpdates ? "yes" : "no",
      sms_updates: u.smsUpdates ? "yes" : "no",
      signal: u.signalMember ? "yes" : "no",
      monthly_commitment: (u.pledges.reduce((s, p) => s + monthlyEquivalent(p.amountCents, p.interval), 0) / 100).toFixed(2),
      total_given: (u.gifts.reduce((s, g) => s + g.amountCents, 0) / 100).toFixed(2),
      source: u.source ?? "",
      tags: u.tags,
      notes: u.notes,
      joined: u.createdAt,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="supporters-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
