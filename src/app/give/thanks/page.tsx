import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { getSettings } from "@/lib/settings";
import { stripeConfigured } from "@/lib/config";
import { syncCheckoutById } from "@/lib/stripe-sync";
import { sendLoginLink, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thank you" };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string; manual?: string }> }) {
  const sp = await searchParams;
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);

  // Don't rely only on the webhook: confirm the Checkout session here too (idempotent).
  if (sp.session_id && stripeConfigured()) {
    try {
      const session = await syncCheckoutById(sp.session_id);
      const email = session.customer_details?.email;
      if (!user && email) await sendLoginLink(email, "/account");
    } catch (err) {
      console.error("Could not confirm checkout session", err);
    }
  }

  return (
    <PublicShell>
      <div className="container-page flex justify-center py-16">
        <div className="card w-full max-w-xl text-center">
          <div className="mb-4 text-5xl">🙏</div>
          <h1 className="h-display mb-4">Thank you!</h1>
          <p className="mb-4 text-lg text-muted">
            We&apos;re so grateful you&apos;re part of {s.siteName}. You&apos;ll start getting our updates soon.
          </p>
          {sp.manual && s.givingInstructions && (
            <div className="mb-6 rounded-xl bg-sand/50 p-4 text-left">
              <h2 className="mb-2 font-semibold">How to send your gift</h2>
              <p className="whitespace-pre-line text-sm">{s.givingInstructions}</p>
            </div>
          )}
          {user ? (
            <Link href="/account" className="btn-primary">Go to my account</Link>
          ) : (
            <p className="text-sm text-muted">We emailed you a link to your account, where you can change your gift or update preferences anytime.</p>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
