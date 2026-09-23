"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildUpdateEmail, sendEmail, sendUpdateToSupporters } from "@/lib/messaging";
import { deletePhoto, savePhoto } from "@/lib/uploads";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

const WEEKLY_TEMPLATE = `## This week
What happened? Share one story — a person, a conversation, a moment.

## Praise
- Something to celebrate

## Prayer requests
- Something specific we'd love prayer for

## Coming up
What's next week (or month) look like?

Thank you for making this possible. We couldn't do it without you!`;

function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 60);
}

async function uniqueSlug(base: string, id?: string) {
  let slug = base || "update";
  for (let i = 2; ; i++) {
    const clash = await db.update.findUnique({ where: { slug } });
    if (!clash || clash.id === id) return slug;
    slug = `${base}-${i}`;
  }
}

export async function createUpdate() {
  await requireAdmin();
  const weekOf = mondayOf();
  const title = `Week of ${weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  const update = await db.update.create({
    data: { title, weekOf, body: WEEKLY_TEMPLATE, slug: await uniqueSlug(`${weekOf.toISOString().slice(0, 10)}-${slugify(title)}`) },
  });
  redirect(`/admin/updates/${update.id}`);
}

export async function saveUpdate(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const existing = await db.update.findUniqueOrThrow({ where: { id } });
  const title = str(formData, "title") || existing.title;
  const weekOf = formData.get("weekOf") ? new Date(`${str(formData, "weekOf")}T12:00:00`) : existing.weekOf;

  // Slugs are fixed once published so links in sent emails keep working.
  const slug = existing.publishedAt ? existing.slug : await uniqueSlug(`${weekOf.toISOString().slice(0, 10)}-${slugify(title)}`, id);

  await db.update.update({
    where: { id },
    data: {
      title,
      weekOf,
      slug,
      summary: str(formData, "summary"),
      body: String(formData.get("body") ?? ""),
      visibility: str(formData, "visibility") === "PUBLIC" ? "PUBLIC" : "SUPPORTERS",
    },
  });

  // Existing photo captions + removals
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("caption:")) {
      await db.photo.updateMany({ where: { id: key.slice(8), updateId: id }, data: { caption: String(value).trim() } });
    }
  }
  for (const photoId of formData.getAll("removePhoto")) {
    const photo = await db.photo.findFirst({ where: { id: String(photoId), updateId: id } });
    if (photo) await deletePhoto(photo.id);
  }

  // New photos
  const errors: string[] = [];
  for (const file of formData.getAll("photos")) {
    if (file instanceof File && file.size > 0) {
      try {
        await savePhoto(file, { updateId: id });
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
      }
    }
  }

  revalidatePath(`/admin/updates/${id}`);
  const intent = str(formData, "intent");
  if (errors.length) redirect(`/admin/updates/${id}?error=${encodeURIComponent(errors.join("; "))}`);
  if (intent === "publish") return publishAndMaybeSend(id, false);
  if (intent === "publish-send") return publishAndMaybeSend(id, true);
  if (intent === "test") return sendTest(id);
  redirect(`/admin/updates/${id}?notice=saved`);
}

async function publishAndMaybeSend(id: string, send: boolean) {
  const update = await db.update.findUniqueOrThrow({ where: { id } });
  await db.update.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: update.publishedAt ?? new Date() },
  });
  if (!send) redirect(`/admin/updates/${id}?notice=published`);
  const tally = await sendUpdateToSupporters(id);
  redirect(`/admin/updates/${id}?notice=sent&email=${tally.email}&sms=${tally.sms}&failed=${tally.failed}&skipped=${tally.skipped}`);
}

async function sendTest(id: string) {
  const admin = await requireAdmin();
  const update = await db.update.findUniqueOrThrow({ where: { id }, include: { photos: { orderBy: { createdAt: "asc" } } } });
  const email = await buildUpdateEmail(update, admin.unsubscribeToken, admin.name.split(" ")[0] ?? "");
  const result = await sendEmail({ to: admin.email, ...email, subject: `[TEST] ${email.subject}` });
  redirect(`/admin/updates/${id}?notice=${result.status === "FAILED" ? "testfailed" : "test"}`);
}

export async function resendToNew(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const tally = await sendUpdateToSupporters(id);
  redirect(`/admin/updates/${id}?notice=sent&email=${tally.email}&sms=${tally.sms}&failed=${tally.failed}&skipped=${tally.skipped}`);
}

export async function unpublishUpdate(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  await db.update.update({ where: { id }, data: { status: "DRAFT" } });
  redirect(`/admin/updates/${id}?notice=unpublished`);
}

export async function deleteUpdate(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const photos = await db.photo.findMany({ where: { updateId: id } });
  for (const p of photos) await deletePhoto(p.id);
  await db.update.delete({ where: { id } });
  redirect("/admin/updates");
}
