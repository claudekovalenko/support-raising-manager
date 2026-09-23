import "server-only";
import { db } from "./db";
import { APP_URL, emailConfigured, smsConfigured } from "./config";
import { escapeHtml, markdownToText, renderMarkdown } from "./markdown";
import { getSettings } from "./settings";

type Email = { to: string; subject: string; text: string; html: string };
type SendResult = { status: "SENT" | "LOGGED" | "FAILED"; error?: string };

/** Sends via Resend when configured; otherwise prints to the server console (handy in development). */
export async function sendEmail(email: Email): Promise<SendResult> {
  if (!emailConfigured()) {
    console.log(`\n📧 [email not configured — printing instead]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    return { status: "LOGGED" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Updates <onboarding@resend.dev>",
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!res.ok) return { status: "FAILED", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { status: "SENT" };
  } catch (err) {
    return { status: "FAILED", error: String(err) };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (!smsConfigured()) {
    console.log(`\n📱 [SMS not configured — printing instead]\nTo: ${to}\n\n${body}\n`);
    return { status: "LOGGED" };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER!, Body: body }),
    });
    if (!res.ok) return { status: "FAILED", error: `Twilio ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { status: "SENT" };
  } catch (err) {
    return { status: "FAILED", error: String(err) };
  }
}

export const photoUrl = (fileName: string) => `${APP_URL}/media/${fileName}`;

type UpdateWithPhotos = NonNullable<Awaited<ReturnType<typeof loadUpdate>>>;

function loadUpdate(updateId: string) {
  return db.update.findUnique({ where: { id: updateId }, include: { photos: { orderBy: { createdAt: "asc" } } } });
}

export async function buildUpdateEmail(update: UpdateWithPhotos, unsubscribeToken: string, firstName: string) {
  const settings = await getSettings();
  const link = `${APP_URL}/updates/${update.slug}`;
  const unsubscribe = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi friend,";
  const photos = update.photos
    .map(
      (p) =>
        `<figure style="margin:20px 0"><img src="${photoUrl(p.fileName)}" alt="${escapeHtml(p.caption)}" style="width:100%;max-width:560px;border-radius:10px" />${
          p.caption ? `<figcaption style="color:#666;font-size:13px;margin-top:6px">${escapeHtml(p.caption)}</figcaption>` : ""
        }</figure>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Georgia,serif;color:#222">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <p style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1f4d3a;margin:0 0 8px">${escapeHtml(settings.siteName)}</p>
  <h1 style="font-size:28px;line-height:1.2;margin:0 0 20px">${escapeHtml(update.title)}</h1>
  <div style="background:#fff;border-radius:14px;padding:24px;font-size:17px;line-height:1.6">
    <p>${escapeHtml(greeting)}</p>
    ${renderMarkdown(update.body)}
    ${photos}
    <p style="margin-top:28px"><a href="${link}" style="color:#1f4d3a">Read this update online →</a></p>
  </div>
  <p style="font-family:Arial,sans-serif;font-size:12px;color:#888;text-align:center;margin-top:24px">
    You're receiving this because you partner with ${escapeHtml(settings.siteName)}.<br>
    <a href="${APP_URL}/account" style="color:#888">Manage your giving & preferences</a> · <a href="${unsubscribe}" style="color:#888">Unsubscribe</a>
  </p>
</div></body></html>`;

  const text = `${greeting}\n\n${markdownToText(update.body)}\n\nRead online: ${link}\n\nManage preferences: ${APP_URL}/account\nUnsubscribe: ${unsubscribe}`;
  return { subject: update.title, html, text };
}

export function buildUpdateSms(update: { title: string; slug: string; summary: string }, siteName: string) {
  const summary = update.summary ? ` ${update.summary}` : "";
  return `${siteName}: ${update.title}.${summary} Read it here: ${APP_URL}/updates/${update.slug} (Reply STOP to opt out)`;
}

/** The text you paste into your Signal group (or share from your phone). */
export function buildSignalPost(update: { title: string; slug: string; body: string }) {
  return `${update.title}\n\n${markdownToText(update.body)}\n\n📷 Photos & full update: ${APP_URL}/updates/${update.slug}`;
}

/**
 * Sends an update to every active supporter on the channels they chose.
 * Anyone who already received it on a channel is skipped, so re-sending is safe.
 */
export async function sendUpdateToSupporters(updateId: string) {
  const update = await loadUpdate(updateId);
  if (!update) throw new Error("Update not found");
  const settings = await getSettings();

  const recipients = await db.user.findMany({
    where: { status: "ACTIVE", OR: [{ emailUpdates: true }, { smsUpdates: true }] },
  });
  const already = await db.delivery.findMany({
    where: { updateId, status: { in: ["SENT", "LOGGED"] } },
    select: { userId: true, channel: true },
  });
  const done = new Set(already.map((d) => `${d.userId}:${d.channel}`));

  const tally = { email: 0, sms: 0, failed: 0, skipped: 0 };
  for (const user of recipients) {
    const firstName = user.name.split(" ")[0] ?? "";
    if (user.emailUpdates) {
      if (done.has(`${user.id}:EMAIL`)) tally.skipped++;
      else {
        const email = await buildUpdateEmail(update, user.unsubscribeToken, firstName);
        const result = await sendEmail({ to: user.email, ...email });
        await db.delivery.create({
          data: { updateId, userId: user.id, channel: "EMAIL", to: user.email, subject: email.subject, ...result },
        });
        result.status === "FAILED" ? tally.failed++ : tally.email++;
      }
    }
    if (user.smsUpdates && user.phone) {
      if (done.has(`${user.id}:SMS`)) tally.skipped++;
      else {
        const result = await sendSms(user.phone, buildUpdateSms(update, settings.siteName));
        await db.delivery.create({ data: { updateId, userId: user.id, channel: "SMS", to: user.phone, ...result } });
        result.status === "FAILED" ? tally.failed++ : tally.sms++;
      }
    }
  }

  await db.update.update({ where: { id: updateId }, data: { sentAt: new Date() } });
  await db.user.updateMany({
    where: { id: { in: recipients.map((r) => r.id) } },
    data: { lastContactedAt: new Date() },
  });
  return tally;
}
