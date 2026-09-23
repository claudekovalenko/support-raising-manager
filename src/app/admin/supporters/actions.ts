"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeEmail, requireAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { INTERVALS, parseDollars } from "@/lib/money";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function supporterData(f: FormData) {
  const phone = str(f, "phone");
  return {
    name: str(f, "name"),
    phone: phone || null,
    address: str(f, "address") || null,
    source: str(f, "source") || null,
    tags: str(f, "tags"),
    notes: str(f, "notes"),
    status: ["ACTIVE", "PAUSED", "UNSUBSCRIBED"].includes(str(f, "status")) ? str(f, "status") : "ACTIVE",
    preferredChannel: ["EMAIL", "SMS", "SIGNAL"].includes(str(f, "preferredChannel")) ? str(f, "preferredChannel") : "EMAIL",
    emailUpdates: f.get("emailUpdates") === "on",
    smsUpdates: f.get("smsUpdates") === "on" && Boolean(phone),
    signalMember: f.get("signalMember") === "on",
  };
}

export async function createSupporter(formData: FormData) {
  await requireAdmin();
  const email = z.string().email().safeParse(str(formData, "email"));
  if (!email.success) redirect("/admin/supporters/new?error=email");
  const existing = await db.user.findUnique({ where: { email: normalizeEmail(email.data) } });
  if (existing) redirect(`/admin/supporters/${existing.id}?notice=exists`);
  const user = await db.user.create({ data: { email: normalizeEmail(email.data), ...supporterData(formData) } });

  const cents = parseDollars(formData.get("amount"));
  if (cents) {
    const interval = INTERVALS.includes(str(formData, "interval") as never) ? str(formData, "interval") : "MONTHLY";
    await db.pledge.create({ data: { userId: user.id, amountCents: cents, interval, method: str(formData, "method") || "OTHER" } });
  }
  redirect(`/admin/supporters/${user.id}`);
}

export async function updateSupporter(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  await db.user.update({ where: { id }, data: supporterData(formData) });
  revalidatePath(`/admin/supporters/${id}`);
  redirect(`/admin/supporters/${id}?notice=saved`);
}

export async function deleteSupporter(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const user = await db.user.findUnique({ where: { id } });
  if (user?.role === "ADMIN") redirect(`/admin/supporters/${id}?notice=admin`);
  await db.user.delete({ where: { id } });
  redirect("/admin/supporters");
}

export async function addPledge(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId");
  const cents = parseDollars(formData.get("amount"));
  const interval = str(formData, "interval");
  if (!cents || !INTERVALS.includes(interval as never)) redirect(`/admin/supporters/${userId}?notice=invalid`);
  await db.pledge.create({
    data: {
      userId,
      amountCents: cents,
      interval,
      method: str(formData, "method") || "OTHER",
      startedAt: formData.get("startedAt") ? new Date(str(formData, "startedAt")) : new Date(),
    },
  });
  revalidatePath(`/admin/supporters/${userId}`);
  redirect(`/admin/supporters/${userId}?notice=saved`);
}

export async function updatePledgeStatus(formData: FormData) {
  await requireAdmin();
  const pledge = await db.pledge.findUniqueOrThrow({ where: { id: str(formData, "pledgeId") } });
  const status = str(formData, "status");
  if (!["ACTIVE", "PAUSED", "CANCELED"].includes(status)) throw new Error("Invalid status");
  // Stripe-managed pledges are changed by the supporter (or in the Stripe dashboard) so both stay in sync.
  if (!pledge.stripeSubscriptionId) {
    await db.pledge.update({ where: { id: pledge.id }, data: { status, canceledAt: status === "CANCELED" ? new Date() : null } });
  }
  revalidatePath(`/admin/supporters/${pledge.userId}`);
  redirect(`/admin/supporters/${pledge.userId}`);
}

export async function recordGift(formData: FormData) {
  await requireAdmin();
  const userId = str(formData, "userId") || null;
  const cents = parseDollars(formData.get("amount"));
  const back = userId ? `/admin/supporters/${userId}` : "/admin/finances";
  if (!cents) redirect(`${back}?notice=invalid`);
  await db.gift.create({
    data: {
      userId,
      amountCents: cents,
      method: str(formData, "method") || "CHECK",
      note: str(formData, "note"),
      receivedAt: formData.get("receivedAt") ? new Date(`${str(formData, "receivedAt")}T12:00:00`) : new Date(),
    },
  });
  revalidatePath(back);
  redirect(`${back}?notice=gift`);
}

export async function deleteGift(formData: FormData) {
  await requireAdmin();
  const gift = await db.gift.delete({ where: { id: str(formData, "giftId") } });
  redirect(gift.userId ? `/admin/supporters/${gift.userId}` : "/admin/finances");
}

/** CSV columns (any order, case-insensitive): email, name, phone, address, source, tags, notes, amount, interval */
export async function importSupporters(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/supporters/import?error=file");
  const rows = parseCsv(await file.text());
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const email = z.string().email().safeParse(row.email ?? row["e-mail"] ?? "");
    if (!email.success) { skipped++; continue; }
    const normalized = normalizeEmail(email.data);
    const name = row.name || [row["first name"], row["last name"]].filter(Boolean).join(" ");
    const existing = await db.user.findUnique({ where: { email: normalized } });
    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: {
            name: existing.name || name,
            phone: existing.phone || row.phone || null,
            address: existing.address || row.address || null,
            source: existing.source || row.source || null,
            tags: existing.tags || row.tags || "",
            notes: [existing.notes, row.notes].filter(Boolean).join("\n"),
          },
        })
      : await db.user.create({
          data: {
            email: normalized,
            name,
            phone: row.phone || null,
            address: row.address || null,
            source: row.source || "Import",
            tags: row.tags || "",
            notes: row.notes || "",
            smsUpdates: false,
          },
        });
    existing ? updated++ : created++;
    const cents = parseDollars(row.amount ?? null);
    const interval = (row.interval || "MONTHLY").toUpperCase().replace(/[\s-]/g, "_");
    if (cents && INTERVALS.includes(interval as never)) {
      const hasPledge = await db.pledge.count({ where: { userId: user.id, status: "ACTIVE" } });
      if (!hasPledge) await db.pledge.create({ data: { userId: user.id, amountCents: cents, interval, method: "OTHER" } });
    }
  }
  redirect(`/admin/supporters?imported=${created}&updated=${updated}&skipped=${skipped}`);
}
