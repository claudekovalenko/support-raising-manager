import "server-only";
import Stripe from "stripe";
import { db } from "./db";
import { APP_URL } from "./config";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

const RECURRING: Record<string, { interval: "month" | "year"; interval_count: number }> = {
  MONTHLY: { interval: "month", interval_count: 1 },
  QUARTERLY: { interval: "month", interval_count: 3 },
  ANNUAL: { interval: "year", interval_count: 1 },
};

async function ensureCustomer(user: { id: string; email: string; name: string; stripeCustomerId: string | null }) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Creates a Stripe Checkout page for a new pledge. Returns the URL to redirect to. */
export async function createCheckout(opts: {
  user: { id: string; email: string; name: string; stripeCustomerId: string | null };
  pledgeId: string;
  amountCents: number;
  interval: string;
  siteName: string;
}) {
  const customer = await ensureCustomer(opts.user);
  const recurring = RECURRING[opts.interval];
  const session = await stripe().checkout.sessions.create({
    customer,
    mode: recurring ? "subscription" : "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.amountCents,
          product_data: { name: `Support for ${opts.siteName}` },
          ...(recurring ? { recurring } : {}),
        },
      },
    ],
    metadata: { pledgeId: opts.pledgeId, userId: opts.user.id },
    ...(recurring
      ? { subscription_data: { metadata: { pledgeId: opts.pledgeId, userId: opts.user.id } } }
      : { payment_intent_data: { metadata: { pledgeId: opts.pledgeId, userId: opts.user.id } } }),
    success_url: `${APP_URL}/give/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/give?canceled=1`,
  });
  return session.url!;
}

/** Changes the amount on an existing Stripe subscription (takes effect next billing cycle). */
export async function changeSubscriptionAmount(subscriptionId: string, amountCents: number, interval: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  const product = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
  await stripe().subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price_data: { currency: "usd", unit_amount: amountCents, product, recurring: RECURRING[interval] } }],
    proration_behavior: "none",
  });
}

export async function setSubscriptionPaused(subscriptionId: string, paused: boolean) {
  await stripe().subscriptions.update(subscriptionId, {
    pause_collection: paused ? { behavior: "void" } : null,
  } as Stripe.SubscriptionUpdateParams);
}

export async function cancelSubscription(subscriptionId: string) {
  await stripe().subscriptions.cancel(subscriptionId);
}

/** Link to Stripe's hosted page where supporters update their card. */
export async function billingPortalUrl(customerId: string) {
  const session = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${APP_URL}/account` });
  return session.url;
}
