"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { stripeConfigured } from "@/lib/config";
import { parseDollars } from "@/lib/money";
import { billingPortalUrl, cancelSubscription, changeSubscriptionAmount, setSubscriptionPaused } from "@/lib/stripe";

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const phone = String(formData.get("phone") || "").trim();
  await db.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") || "").trim().slice(0, 120),
      phone: phone || null,
      address: String(formData.get("address") || "").trim() || null,
      emailUpdates: formData.get("emailUpdates") === "on",
      smsUpdates: formData.get("smsUpdates") === "on" && Boolean(phone),
      signalMember: formData.get("signalMember") === "on",
      status: user.status === "UNSUBSCRIBED" ? "ACTIVE" : user.status,
    },
  });
  revalidatePath("/account");
  redirect("/account?saved=profile");
}

async function ownPledge(pledgeId: string) {
  const user = await requireUser();
  const pledge = await db.pledge.findFirst({ where: { id: pledgeId, userId: user.id } });
  if (!pledge) throw new Error("Pledge not found");
  return pledge;
}

export async function changePledgeAmount(formData: FormData) {
  const pledge = await ownPledge(String(formData.get("pledgeId")));
  const cents = parseDollars(formData.get("amount"));
  if (!cents || cents < 100) redirect("/account?error=amount");
  if (pledge.stripeSubscriptionId && stripeConfigured()) {
    await changeSubscriptionAmount(pledge.stripeSubscriptionId, cents, pledge.interval);
  }
  await db.pledge.update({ where: { id: pledge.id }, data: { amountCents: cents } });
  revalidatePath("/account");
  redirect("/account?saved=pledge");
}

export async function setPledgeStatus(formData: FormData) {
  const pledge = await ownPledge(String(formData.get("pledgeId")));
  const next = String(formData.get("status"));
  if (!["ACTIVE", "PAUSED", "CANCELED"].includes(next)) throw new Error("Invalid status");
  if (pledge.stripeSubscriptionId && stripeConfigured()) {
    if (next === "CANCELED") await cancelSubscription(pledge.stripeSubscriptionId);
    else await setSubscriptionPaused(pledge.stripeSubscriptionId, next === "PAUSED");
  }
  await db.pledge.update({
    where: { id: pledge.id },
    data: { status: next, canceledAt: next === "CANCELED" ? new Date() : null },
  });
  revalidatePath("/account");
  redirect("/account?saved=pledge");
}

export async function openBillingPortal() {
  const user = await requireUser();
  if (!user.stripeCustomerId || !stripeConfigured()) redirect("/account");
  redirect(await billingPortalUrl(user.stripeCustomerId));
}
