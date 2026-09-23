import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";

export async function GET() {
  await requireAdmin();
  const gifts = await db.gift.findMany({ orderBy: { receivedAt: "desc" }, include: { user: true } });
  const csv = toCsv(
    gifts.map((g) => ({
      date: g.receivedAt,
      name: g.user?.name ?? "",
      email: g.user?.email ?? "",
      amount: (g.amountCents / 100).toFixed(2),
      method: g.method,
      note: g.note,
      stripe_id: g.stripePaymentId ?? "",
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gifts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
