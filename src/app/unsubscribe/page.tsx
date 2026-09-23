import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = { title: "Unsubscribe" };

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  await db.user.updateMany({ where: { unsubscribeToken: token }, data: { emailUpdates: false, smsUpdates: false } });
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const { token = "", done } = await searchParams;
  const user = token ? await db.user.findUnique({ where: { unsubscribeToken: token } }) : null;
  return (
    <PublicShell>
      <div className="container-page flex justify-center py-16">
        <div className="card w-full max-w-md text-center">
          {!user ? (
            <p>This unsubscribe link isn&apos;t valid. <Link href="/account" className="text-brand underline">Manage preferences</Link> instead.</p>
          ) : done ? (
            <>
              <h1 className="h-section mb-3">You&apos;re unsubscribed</h1>
              <p className="text-muted">You won&apos;t receive update emails or texts. Your giving (if any) is not affected.</p>
              <Link href="/account" className="btn-secondary mt-6">Manage my account</Link>
            </>
          ) : (
            <form action={unsubscribe}>
              <input type="hidden" name="token" value={token} />
              <h1 className="h-section mb-3">Stop receiving updates?</h1>
              <p className="mb-6 text-muted">We&apos;ll stop sending updates to {user.email}. This doesn&apos;t change any giving.</p>
              <SubmitButton pendingText="Unsubscribing…">Unsubscribe</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
