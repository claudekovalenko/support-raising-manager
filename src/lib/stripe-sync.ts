import "server-only";
import type Stripe from "stripe";
import { db } from "./db";
import { stripe } from "./stripe";

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id ?? null);

/** Marks a pledge active once its Checkout completes. Safe to call more than once. */
export async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const pledgeId = session.metadata?.pledgeId;
  if (!pledgeId || session.status !== "complete") return;
  const pledge = await db.pledge.findUnique({ where: { id: pledgeId } });
  if (!pledge) return;

  if (session.mode === "subscription") {
    await db.pledge.update({
      where: { id: pledgeId },
      data: { status: "ACTIVE", stripeSubscriptionId: idOf(session.subscription) },
    });
  } else if (session.payment_status === "paid") {
    const paymentId = idOf(session.payment_intent) ?? session.id;
    await db.pledge.update({ where: { id: pledgeId }, data: { status: "COMPLETED" } });
    await db.gift.upsert({
      where: { stripePaymentId: paymentId },
      create: { userId: pledge.userId, amountCents: session.amount_total ?? pledge.amountCents, method: "STRIPE", stripePaymentId: paymentId, note: "One-time gift" },
      update: {},
    });
  }
}

export async function recordInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.id || invoice.amount_paid <= 0) return;
  const user = await db.user.findUnique({ where: { stripeCustomerId: idOf(invoice.customer) ?? "" } });
  await db.gift.upsert({
    where: { stripePaymentId: invoice.id },
    create: {
      userId: user?.id,
      amountCents: invoice.amount_paid,
      receivedAt: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000),
      method: "STRIPE",
      stripePaymentId: invoice.id,
      note: user ? "" : `Stripe customer ${idOf(invoice.customer)}`,
    },
    update: {},
  });
}

export async function syncSubscription(sub: Stripe.Subscription) {
  const pledge = await db.pledge.findFirst({
    where: { OR: [{ stripeSubscriptionId: sub.id }, { id: sub.metadata?.pledgeId ?? "" }] },
  });
  if (!pledge) return;
  const amount = sub.items.data[0]?.price.unit_amount ?? pledge.amountCents;
  const status =
    sub.status === "canceled" || sub.status === "incomplete_expired"
      ? "CANCELED"
      : sub.pause_collection
        ? "PAUSED"
        : sub.status === "active" || sub.status === "trialing" || sub.status === "past_due"
          ? "ACTIVE"
          : pledge.status;
  await db.pledge.update({
    where: { id: pledge.id },
    data: {
      stripeSubscriptionId: sub.id,
      amountCents: amount,
      status,
      canceledAt: status === "CANCELED" ? (pledge.canceledAt ?? new Date()) : null,
    },
  });
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return syncCheckoutSession(event.data.object);
    case "invoice.paid":
      return recordInvoicePaid(event.data.object);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return syncSubscription(event.data.object);
  }
}

export async function syncCheckoutById(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  await syncCheckoutSession(session);
  return session;
}
