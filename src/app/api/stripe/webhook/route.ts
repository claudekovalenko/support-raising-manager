import { stripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-sync";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 500 });
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  await handleStripeEvent(event);
  return Response.json({ received: true });
}
