"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, normalizeEmail, sendLoginLink } from "@/lib/auth";
import { adminEmails, APP_URL, stripeConfigured } from "@/lib/config";
import { formatMoney, INTERVAL_LABELS, INTERVALS, parseDollars } from "@/lib/money";
import { sendEmail } from "@/lib/messaging";
import { getSettings } from "@/lib/settings";
import { createCheckout } from "@/lib/stripe";

export type GiveState = { error?: string };

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  interval: z.enum(INTERVALS),
  method: z.enum(["STRIPE", "MANUAL"]),
  channel: z.enum(["EMAIL", "SMS", "SIGNAL"]),
});

export async function give(_prev: GiveState, formData: FormData): Promise<GiveState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const amountCents = parseDollars(formData.get("amount"));
  if (!amountCents || amountCents < 100) return { error: "Please choose an amount of at least $1." };
  const { name, phone, interval, method, channel } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  if (channel === "SMS" && !phone) return { error: "Add a phone number to get updates by text." };
  if (method === "STRIPE" && !stripeConfigured()) return { error: "Online card giving isn't set up yet." };

  // Someone who isn't signed in could type any email, so for existing accounts we
  // only fill in blanks rather than overwrite what the supporter set themselves.
  const current = await getCurrentUser();
  const existing = await db.user.findUnique({ where: { email } });
  const trusted = current?.email === email;
  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: trusted
          ? { name, phone: phone || existing.phone, preferredChannel: channel, smsUpdates: channel === "SMS" || existing.smsUpdates, signalMember: channel === "SIGNAL" || existing.signalMember }
          : { name: existing.name || name, phone: existing.phone || phone || null },
      })
    : await db.user.create({
        data: {
          email,
          name,
          phone: phone || null,
          preferredChannel: channel,
          smsUpdates: channel === "SMS",
          signalMember: channel === "SIGNAL",
          source: "Website",
        },
      });

  const pledge = await db.pledge.create({
    data: {
      userId: user.id,
      amountCents,
      interval,
      method: method === "STRIPE" ? "STRIPE" : "OTHER",
      status: method === "STRIPE" ? "PENDING" : "ACTIVE",
    },
  });

  const settings = await getSettings();
  const summary = `${formatMoney(amountCents)} ${INTERVAL_LABELS[interval]}`;
  for (const admin of adminEmails()) {
    await sendEmail({
      to: admin,
      subject: `New pledge: ${name} — ${summary}${method === "STRIPE" ? " (awaiting card)" : ""}`,
      text: `${name} <${email}> pledged ${summary} via ${method === "STRIPE" ? "card" : "check/bank"}.\n\n${APP_URL}/admin/supporters/${user.id}`,
      html: `<p><strong>${name}</strong> &lt;${email}&gt; pledged <strong>${summary}</strong> via ${method === "STRIPE" ? "card" : "check/bank"}.</p><p><a href="${APP_URL}/admin/supporters/${user.id}">Open in dashboard</a></p>`,
    });
  }

  if (method === "STRIPE") {
    const url = await createCheckout({ user, pledgeId: pledge.id, amountCents, interval, siteName: settings.siteName });
    redirect(url);
  }

  if (!trusted) await sendLoginLink(email, "/account");
  redirect(`/give/thanks?manual=1`);
}
